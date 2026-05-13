/**
 * Tests for DATA-27: MCP includeTools merge across skills
 *
 * 逆向: modules/1338_SkillService_UqR.js:73-137
 */

import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { SkillService } from "../skill-service";

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "flitter-mcp-merge-"));
  tmpDirs.push(dir);
  return dir;
}

function writeSkillMd(dir: string, content: string): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "SKILL.md"), content);
}

afterEach(() => {
  for (const dir of tmpDirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
  tmpDirs.length = 0;
});

describe("DATA-27: MCP includeTools merge across skills", () => {
  it("merges includeTools when same server from multiple skills with matching specs", async () => {
    const workspace = makeTmpDir();
    const userConfig = makeTmpDir();

    writeSkillMd(
      path.join(workspace, ".agents", "skills", "skill-a"),
      `---
name: skill-a
description: Skill A
mcpServers:
  shared-server:
    command: node
    args:
      - server.js
    includeTools:
      - tool-1
      - tool-2
---
Body A
`,
    );

    writeSkillMd(
      path.join(workspace, ".agents", "skills", "skill-b"),
      `---
name: skill-b
description: Skill B
mcpServers:
  shared-server:
    command: node
    args:
      - server.js
    includeTools:
      - tool-2
      - tool-3
---
Body B
`,
    );

    const service = new SkillService({ workspaceRoot: workspace, userConfigDir: userConfig });
    await service.scan();

    const servers = service.mcpServersFromSkills.getValue();
    expect(servers["shared-server"]).toBeDefined();

    const spec = servers["shared-server"]!;
    // Merged includeTools: tool-1, tool-2, tool-3 (deduped)
    expect(spec.includeTools).toBeDefined();
    expect(spec.includeTools!.sort()).toEqual(["tool-1", "tool-2", "tool-3"]);

    // Tracks both skill names
    expect(spec._skillNames).toBeDefined();
    expect(spec._skillNames!.sort()).toEqual(["skill-a", "skill-b"]);

    // Per-skill includeTools tracking
    expect(spec._skillIncludeTools).toBeDefined();
    expect(spec._skillIncludeTools!["skill-a"]).toEqual(["tool-1", "tool-2"]);
    expect(spec._skillIncludeTools!["skill-b"]).toEqual(["tool-2", "tool-3"]);
  });

  it("warns and skips on collision with different specs", async () => {
    const workspace = makeTmpDir();
    const userConfig = makeTmpDir();

    writeSkillMd(
      path.join(workspace, ".agents", "skills", "skill-a"),
      `---
name: skill-a
description: Skill A
mcpServers:
  conflict-server:
    command: node
    args:
      - server-a.js
---
Body A
`,
    );

    writeSkillMd(
      path.join(workspace, ".agents", "skills", "skill-b"),
      `---
name: skill-b
description: Skill B
mcpServers:
  conflict-server:
    command: python
    args:
      - server-b.py
---
Body B
`,
    );

    const service = new SkillService({ workspaceRoot: workspace, userConfigDir: userConfig });
    await service.scan();

    const servers = service.mcpServersFromSkills.getValue();
    // Only first skill's server should be present (second is skipped)
    expect(servers["conflict-server"]).toBeDefined();
    expect(servers["conflict-server"]!.command).toBe("node");
    expect(servers["conflict-server"]!._skillNames).toEqual(["skill-a"]);
  });

  it("handles server without includeTools (no merge needed)", async () => {
    const workspace = makeTmpDir();
    const userConfig = makeTmpDir();

    writeSkillMd(
      path.join(workspace, ".agents", "skills", "skill-a"),
      `---
name: skill-a
description: Skill A
mcpServers:
  plain-server:
    command: node
    args:
      - server.js
---
Body A
`,
    );

    const service = new SkillService({ workspaceRoot: workspace, userConfigDir: userConfig });
    await service.scan();

    const servers = service.mcpServersFromSkills.getValue();
    expect(servers["plain-server"]).toBeDefined();
    expect(servers["plain-server"]!.command).toBe("node");
    expect(servers["plain-server"]!._skillName).toBe("skill-a");
    expect(servers["plain-server"]!.includeTools).toBeUndefined();
    expect(servers["plain-server"]!._skillIncludeTools).toBeUndefined();
  });

  it("merges with one skill having includeTools and other not", async () => {
    const workspace = makeTmpDir();
    const userConfig = makeTmpDir();

    writeSkillMd(
      path.join(workspace, ".agents", "skills", "skill-a"),
      `---
name: skill-a
description: Skill A
mcpServers:
  mixed-server:
    command: node
    args:
      - server.js
    includeTools:
      - tool-1
---
Body A
`,
    );

    writeSkillMd(
      path.join(workspace, ".agents", "skills", "skill-b"),
      `---
name: skill-b
description: Skill B
mcpServers:
  mixed-server:
    command: node
    args:
      - server.js
---
Body B
`,
    );

    const service = new SkillService({ workspaceRoot: workspace, userConfigDir: userConfig });
    await service.scan();

    const servers = service.mcpServersFromSkills.getValue();
    expect(servers["mixed-server"]).toBeDefined();
    // Only skill-a had includeTools, so merged = tool-1
    expect(servers["mixed-server"]!.includeTools).toEqual(["tool-1"]);
    expect(servers["mixed-server"]!._skillNames!.sort()).toEqual(["skill-a", "skill-b"]);
  });
});
