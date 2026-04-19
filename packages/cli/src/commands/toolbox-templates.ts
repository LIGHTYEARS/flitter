/**
 * @flitter/cli — Toolbox tool templates
 *
 * Templates for `flitter tools make` command. Generates starter scripts
 * for each supported language (bun/ts, bash, zsh).
 *
 * 逆向: amp has similar templates in its `tools make` subcommand.
 */

// ─── Template types ──────────────────────────────────────

export type ToolboxLanguage = "bun" | "bash" | "zsh";

export interface ToolboxTemplateOptions {
  /** Tool name (used in describe output) */
  name: string;
  /** Target language */
  language: ToolboxLanguage;
}

// ─── Templates ──────────────────────────────────────────

/**
 * Generate a toolbox script template for the given language.
 */
export function generateToolboxTemplate(opts: ToolboxTemplateOptions): string {
  switch (opts.language) {
    case "bun":
      return bunTemplate(opts.name);
    case "bash":
      return bashTemplate(opts.name);
    case "zsh":
      return zshTemplate(opts.name);
    default:
      return bashTemplate(opts.name);
  }
}

/**
 * Bun/TypeScript template
 */
function bunTemplate(name: string): string {
  return `#!/usr/bin/env bun
/**
 * Toolbox tool: ${name}
 *
 * TOOLBOX_ACTION=describe → output JSON schema
 * TOOLBOX_ACTION=execute  → read args from stdin, run logic, output result
 */

const action = process.env.TOOLBOX_ACTION;

if (action === "describe") {
  console.log(JSON.stringify({
    name: ${JSON.stringify(name)},
    description: "TODO: describe what this tool does",
    inputSchema: {
      type: "object",
      properties: {
        // TODO: define your input parameters
        // example: { type: "string", description: "An example parameter" }
      }
    }
  }));
} else if (action === "execute") {
  const input = await Bun.stdin.text();
  const args = JSON.parse(input);

  // TODO: implement tool logic using args
  console.log("Tool executed successfully");
}
`;
}

/**
 * Bash template
 */
function bashTemplate(name: string): string {
  return `#!/usr/bin/env bash
# Toolbox tool: ${name}
#
# TOOLBOX_ACTION=describe → output JSON schema
# TOOLBOX_ACTION=execute  → read args from stdin, run logic, output result

set -euo pipefail

if [[ "\$TOOLBOX_ACTION" == "describe" ]]; then
  cat <<'JSON'
{"name":${JSON.stringify(name)},"description":"TODO: describe what this tool does","inputSchema":{"type":"object","properties":{}}}
JSON
elif [[ "\$TOOLBOX_ACTION" == "execute" ]]; then
  input=$(cat)
  # TODO: parse input JSON and implement tool logic
  # Example: echo "$input" | jq -r '.param'
  echo "Tool executed successfully"
fi
`;
}

/**
 * Zsh template
 */
function zshTemplate(name: string): string {
  return `#!/usr/bin/env zsh
# Toolbox tool: ${name}
#
# TOOLBOX_ACTION=describe → output JSON schema
# TOOLBOX_ACTION=execute  → read args from stdin, run logic, output result

set -euo pipefail

if [[ "\$TOOLBOX_ACTION" == "describe" ]]; then
  cat <<'JSON'
{"name":${JSON.stringify(name)},"description":"TODO: describe what this tool does","inputSchema":{"type":"object","properties":{}}}
JSON
elif [[ "\$TOOLBOX_ACTION" == "execute" ]]; then
  input=$(cat)
  # TODO: parse input JSON and implement tool logic
  echo "Tool executed successfully"
fi
`;
}

/**
 * File extension for a given language.
 */
export function getTemplateExtension(language: ToolboxLanguage): string {
  switch (language) {
    case "bun":
      return ".ts";
    case "bash":
      return ".sh";
    case "zsh":
      return ".zsh";
    default:
      return ".sh";
  }
}
