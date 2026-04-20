# Gap 6: Toolbox Service

> Implementation plan for the toolbox system — user shell scripts registered as LLM-callable tools.

## Overview

Amp's toolbox allows users to write shell scripts (Bash, Zsh, Bun/TS) that are discovered and registered as tools the LLM can call. Scripts communicate via the `TOOLBOX_ACTION` protocol: `describe` to report their schema, `execute` to run with args.

## Amp Reference

| Component | File | Key logic |
|---|---|---|
| Toolbox service | `modules/1371_Toolbox_S5R.js` | Full 184-line module |
| Directory scanning | `chunk-002.js:30412` | `d5R()` — scan, spawn `describe`, register |
| Name sanitization | `chunk-002.js:30409` | `O5R()` — `tb__` prefix |
| Describe protocol | `chunk-002.js:30464-30546` | `C5R()` — `TOOLBOX_ACTION=describe` |
| Execute protocol | `chunk-002.js:30548-30641` | `L5R()` — `TOOLBOX_ACTION=execute`, stdin JSON |
| Constants | `chunk-002.js:19780-19781` | Max 100 tools, 5s describe timeout |

## Design

### TOOLBOX_ACTION Protocol

**Describe phase:**
```bash
# Tool script receives:
TOOLBOX_ACTION=describe
AGENT=flitter

# Tool script outputs JSON to stdout:
{
  "name": "run-tests",
  "description": "Run the project test suite",
  "inputSchema": {
    "type": "object",
    "properties": {
      "filter": { "type": "string", "description": "Test name filter" }
    }
  }
}
```

**Execute phase:**
```bash
# Tool script receives:
TOOLBOX_ACTION=execute
AGENT=flitter
AGENT_THREAD_ID=T-abc123

# Tool args arrive as JSON on stdin:
{"filter": "auth"}

# Tool output goes to stdout (plain text or JSON)
```

---

## Implementation Tasks

### Task 1: Toolbox types

**New file:** `packages/agent-core/src/toolbox/types.ts`

```typescript
export interface ToolboxToolSpec {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

export type ToolboxToolStatus = "pending" | "registered" | "failed" | "duplicate";

export interface ToolboxToolInfo {
  name: string;
  originalName: string;
  description: string;
  status: ToolboxToolStatus;
  error?: string;
  scriptPath: string;
}

export interface ToolboxStatus {
  type: "initializing" | "ready";
  toolCount?: number;
}
```

### Task 2: Name sanitization

**New file:** `packages/agent-core/src/toolbox/toolbox-utils.ts`

```typescript
const TOOLBOX_PREFIX = "tb__";
const MAX_TOOL_NAME_LENGTH = 120;

export function sanitizeToolName(name: string): string {
  return name
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_TOOL_NAME_LENGTH) || "tool";
}

export function toToolboxName(name: string): string {
  return `${TOOLBOX_PREFIX}${sanitizeToolName(name)}`;
}
```

**Amp ref:** `chunk-002.js:30409` — `O5R()`.

### Task 3: Describe probe

**New file:** `packages/agent-core/src/toolbox/describe.ts`

```typescript
const DESCRIBE_TIMEOUT = 5000; // 5 seconds
const MAX_TOOLS_PER_DIRECTORY = 100;

export async function probeToolScript(
  scriptPath: string,
): Promise<ToolboxToolSpec | null> {
  const env = { ...process.env, TOOLBOX_ACTION: "describe", AGENT: "flitter" };
  const result = await execWithTimeout(scriptPath, { env }, DESCRIBE_TIMEOUT);
  if (result.exitCode !== 0) return null;
  try {
    return JSON.parse(result.stdout) as ToolboxToolSpec;
  } catch {
    // Try legacy text format: first line = name, second = description
    return parseLegacyFormat(result.stdout);
  }
}
```

### Task 4: Execute handler

**New file:** `packages/agent-core/src/toolbox/execute.ts`

```typescript
export async function executeToolboxScript(
  scriptPath: string,
  args: Record<string, unknown>,
  options: { threadId?: string; signal?: AbortSignal; timeout?: number },
): Promise<{ output: string; exitCode: number; truncated: boolean }> {
  const env = {
    ...process.env,
    TOOLBOX_ACTION: "execute",
    AGENT: "flitter",
    AGENT_THREAD_ID: options.threadId ?? "",
    FLITTER_CURRENT_THREAD_ID: options.threadId ?? "",
  };

  const child = spawn(scriptPath, { env, stdio: ["pipe", "pipe", "pipe"] });
  child.stdin.write(JSON.stringify(args));
  child.stdin.end();

  // Collect output with truncation
  let output = "";
  const MAX_OUTPUT = 30_000;
  for await (const chunk of child.stdout) {
    output += chunk;
    if (output.length > MAX_OUTPUT) {
      output = output.slice(0, MAX_OUTPUT) + "\n[Output truncated]";
      break;
    }
  }

  const exitCode = await waitForExit(child, options.timeout ?? 120_000);
  return { output, exitCode, truncated: output.length >= MAX_OUTPUT };
}
```

### Task 5: ToolboxService

**New file:** `packages/agent-core/src/toolbox/toolbox-service.ts`

```typescript
export class ToolboxService implements Disposable {
  private tools: Map<string, ToolboxToolInfo> = new Map();
  private registrations: Map<string, { dispose: () => void }> = new Map();
  private status$: BehaviorSubject<ToolboxStatus>;
  private registeredNames: Set<string> = new Set();

  constructor(
    private toolRegistry: ToolRegistry,
    private paths: string[],  // directories to scan
  ) {
    this.status$ = new BehaviorSubject({ type: "initializing" });
  }

  async scan(): Promise<void> {
    // Clean up old registrations
    for (const [name, reg] of this.registrations) {
      reg.dispose();
    }
    this.registrations.clear();
    this.registeredNames.clear();
    this.tools.clear();

    for (const dir of this.paths) {
      await this.scanDirectory(dir);
    }

    this.status$.next({ type: "ready", toolCount: this.registeredNames.size });
  }

  private async scanDirectory(dir: string): Promise<void> {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir)
      .filter(f => !f.endsWith(".md") && !f.startsWith("."))
      .slice(0, MAX_TOOLS_PER_DIRECTORY);

    const probes = files.map(async (file) => {
      const path = join(dir, file);
      const stat = fs.statSync(path);
      if (stat.isDirectory()) return;

      const spec = await probeToolScript(path);
      if (!spec) {
        this.tools.set(file, { ...defaults, status: "failed", error: "Probe failed" });
        return;
      }

      const toolName = toToolboxName(spec.name);
      if (this.registeredNames.has(toolName)) {
        this.tools.set(file, { ...defaults, status: "duplicate" });
        return;
      }

      this.registeredNames.add(toolName);
      const registration = this.toolRegistry.register({
        name: toolName,
        description: spec.description,
        source: "toolbox",
        isReadOnly: false,
        inputSchema: spec.inputSchema ?? { type: "object", properties: {} },
        executionProfile: { serial: false, resourceKeys: () => [] },
        execute: async (args, context) => {
          const result = await executeToolboxScript(path, args, {
            threadId: context.threadId,
            signal: context.signal,
          });
          return { status: result.exitCode === 0 ? "done" : "error", result: result.output };
        },
      });

      this.registrations.set(toolName, registration);
      this.tools.set(file, { ...defaults, name: toolName, status: "registered" });
    });

    await Promise.all(probes);
  }

  getTools(): ToolboxToolInfo[] { return Array.from(this.tools.values()); }
  getStatus(): ToolboxStatus { return this.status$.getValue(); }
  dispose(): void { for (const reg of this.registrations.values()) reg.dispose(); }
}
```

### Task 6: Path resolution

```typescript
export function resolveToolboxPaths(settings: Settings, homeDir: string): string[] {
  const paths: string[] = [];

  // FLITTER_TOOLBOX env var (colon-separated)
  const envPaths = process.env.FLITTER_TOOLBOX;
  if (envPaths) {
    paths.push(...envPaths.split(":").filter(Boolean));
  }

  // settings.toolbox.path (colon-separated)
  const settingPath = settings["toolbox.path"];
  if (settingPath) {
    paths.push(...String(settingPath).split(":").filter(Boolean));
  }

  // Default path
  if (paths.length === 0) {
    paths.push(join(homeDir, ".local", "share", "flitter", "tools"));
  }

  return paths;
}
```

### Task 7: Wire into container

**File:** `packages/flitter/src/container.ts`

```typescript
const toolboxPaths = resolveToolboxPaths(config.settings, homeDir);
const toolboxService = new ToolboxService(toolRegistry, toolboxPaths);
await toolboxService.scan();
disposables.push(toolboxService);
```

### Task 8: `tools make` template

**File:** `packages/cli/src/commands/toolbox-templates.ts` (new)

Three templates:

**Bun/TypeScript:**
```typescript
#!/usr/bin/env bun
const action = process.env.TOOLBOX_ACTION;
if (action === "describe") {
  console.log(JSON.stringify({
    name: "${name}",
    description: "TODO: describe what this tool does",
    inputSchema: { type: "object", properties: {} }
  }));
} else if (action === "execute") {
  const input = await Bun.stdin.text();
  const args = JSON.parse(input);
  // TODO: implement tool logic
  console.log("Tool executed successfully");
}
```

**Bash:**
```bash
#!/usr/bin/env bash
if [[ "$TOOLBOX_ACTION" == "describe" ]]; then
  cat <<'JSON'
{"name":"${name}","description":"TODO","inputSchema":{"type":"object","properties":{}}}
JSON
elif [[ "$TOOLBOX_ACTION" == "execute" ]]; then
  input=$(cat)
  # TODO: implement
  echo "Tool executed"
fi
```

**Zsh:** Same as bash but with `#!/usr/bin/env zsh`.

### Task 9: Tests

- **Name sanitization:** Edge cases (spaces, special chars, long names)
- **Describe probe:** Mock script that outputs valid/invalid JSON; timeout
- **Execute:** Mock script with args; truncation at 30k chars
- **ToolboxService:** Temp dir with 2 scripts, verify registration and duplicate detection
- **Integration:** Full flow from scan → LLM requests `tb__my-tool` → execution

---

## Estimated Scope

| Task | Files | Complexity |
|---|---|---|
| Types | 1 new | Low |
| Name utils | 1 new | Low |
| Describe probe | 1 new | Medium |
| Execute handler | 1 new | Medium |
| ToolboxService | 1 new | High |
| Path resolution | In service | Low |
| Container wiring | 1 modified | Low |
| Templates | 1 new | Low |
| Tests | 2-3 new | Medium |
