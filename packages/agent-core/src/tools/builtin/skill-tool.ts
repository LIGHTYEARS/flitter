/**
 * @flitter/agent-core — Skill Tool
 *
 * Agent-callable tool to load a skill by name and inject its content
 * into the conversation.
 *
 * 逆向: wWT/DWT in modules/2026_tail_anonymous.js:105691-105755
 *   - spec: name=oc (skill), description explains when to use
 *   - fn: calls I7R(skillService, name, arguments, ...) to resolve
 *   - I7R (chunk-002.js:18908-18973):
 *     1. Finds skill by name from skillService.getSkills()
 *     2. If not found, returns error with available skill names
 *     3. Replaces {{arguments}} in content, or appends ARGUMENTS: section
 *     4. Wraps in <loaded_skill name="...">...</loaded_skill> XML
 *     5. Includes skill_files list
 *     6. Returns { content: string } for conversation injection
 */

import type { ToolContext, ToolResult, ToolSpec } from "../types";

/**
 * Interface for the SkillService dependency.
 * Matches the subset of SkillService we need.
 */
export interface SkillServiceLike {
  /** List all available skill frontmatters */
  list(): SkillFrontmatterLike[];
  /** Get all loaded skills (with full bodies) */
  skills: { getValue(): SkillLike[] };
}

export interface SkillFrontmatterLike {
  name: string;
  description: string;
  mcpServers?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SkillLike {
  name: string;
  description: string;
  baseDir: string;
  frontmatter: SkillFrontmatterLike;
  body: string;
  files?: Array<{ path: string; fullPath: string }>;
}

/**
 * Factory: create a Skill ToolSpec bound to a SkillService.
 *
 * 逆向: I7R receives skillService from the tool environment.
 * Flitter: bind at registration time.
 */
export function createSkillTool(skillService: SkillServiceLike): ToolSpec {
  return {
    name: "Skill",
    description:
      `Load a specialized skill when the task matches one of the skills listed in the system prompt.

Use this tool to inject that skill's instructions and bundled resources into the current conversation. A loaded skill may provide:
- task-specific workflow guidance
- references to scripts, templates, or files in the skill directory
- additional builtin or MCP tools that become available after loading

Use this tool when:
- the user explicitly asks for a skill by name
- the task clearly matches a skill description from the system prompt

You usually only need to load a skill once per context window. After it is loaded, continue following its instructions instead of reloading it.

Parameters:
- name: The name of the skill to load (must match one of the skills listed below)

Example: To use the web-browser skill for interacting with web pages, call this tool with name: "web-browser"`,
    source: "builtin",
    isReadOnly: true,

    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The name of the skill to load",
        },
        arguments: {
          type: "string",
          description: "Optional arguments to pass to the skill",
        },
      },
      required: ["name"],
    },

    executionProfile: {
      // 逆向: chunk-005.js:105727-105729 — resourceKeys: () => []
      resourceKeys: () => [],
    },

    async execute(args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
      const name = args.name as string;
      const skillArgs = args.arguments as string | undefined;

      // Validate name
      if (!name || typeof name !== "string") {
        return {
          status: "error",
          error: "name is required and must be a string",
        };
      }

      // 逆向: I7R line 18909-18916 — find skill by name
      const allSkills = skillService.skills.getValue();
      const skill = allSkills.find((s) => s.name === name);

      if (!skill) {
        const available = allSkills.map((s) => s.name).join(", ");
        return {
          status: "error",
          error: `Skill "${name}" not found. Available skills: ${available || "none"}`,
        };
      }

      // 逆向: I7R line 18917-18921 — substitute {{arguments}} or append
      let content = skill.body;
      if (skillArgs !== undefined) {
        if (content.includes("{{arguments}}")) {
          content = content.replace(/\{\{arguments\}\}/g, skillArgs);
        } else if (skillArgs) {
          content += `\n\nARGUMENTS: ${skillArgs}`;
        }
      }

      // 逆向: I7R line 18924 — wrap in XML tags (non-deep mode)
      const parts: string[] = [
        `<loaded_skill name="${skill.name}">`,
        `# ${skill.frontmatter.name} Skill`,
        "",
        content,
        "",
        `Base directory for this skill: ${skill.baseDir}`,
        "Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.",
      ];

      // 逆向: I7R line 18925-18929 — include skill files
      if (skill.files && skill.files.length > 0) {
        parts.push("");
        parts.push("<skill_files>");
        for (const file of skill.files) {
          parts.push(`<file>${file.fullPath}</file>`);
        }
        parts.push("</skill_files>");
      }

      // 逆向: I7R line 18969 — close tag and replace {baseDir}
      parts.push("</loaded_skill>");
      const finalContent = parts.join("\n").replace(/\{baseDir\}/g, skill.baseDir);

      // 逆向: DWT line 105747-105753 — return content for conversation injection
      return {
        status: "done",
        content: finalContent,
      };
    },
  };
}
