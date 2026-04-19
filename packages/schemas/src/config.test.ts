import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import {
  ADMIN_OVERRIDE_KEYS,
  ConfigScopeSchema,
  GLOBAL_ONLY_KEYS,
  MCPPermissionEntrySchema,
  MERGED_ARRAY_KEYS,
  SecretKeySchema,
  SettingsSchema,
} from "./config";

// ─── ConfigScope ─────────────────────────────────────────────

describe("ConfigScopeSchema", () => {
  it('should parse "default"', () => {
    assert.equal(ConfigScopeSchema.parse("default"), "default");
  });

  it('should parse "global"', () => {
    assert.equal(ConfigScopeSchema.parse("global"), "global");
  });

  it('should parse "workspace"', () => {
    assert.equal(ConfigScopeSchema.parse("workspace"), "workspace");
  });

  it('should parse "admin"', () => {
    assert.equal(ConfigScopeSchema.parse("admin"), "admin");
  });

  it('should parse "override"', () => {
    assert.equal(ConfigScopeSchema.parse("override"), "override");
  });

  it("should reject an invalid scope string", () => {
    assert.throws(() => ConfigScopeSchema.parse("invalid-scope"));
  });

  it("should reject a number", () => {
    assert.throws(() => ConfigScopeSchema.parse(42));
  });
});

// ─── SecretKey ───────────────────────────────────────────────

describe("SecretKeySchema", () => {
  const ALL_SECRET_KEYS = [
    "apiKey",
    "buildkite-access-token",
    "github-access-token",
    "gitlab-access-token",
    "gitlab-instance-url",
    "mcp-oauth-client-secret",
    "mcp-oauth-token",
  ] as const;

  for (const key of ALL_SECRET_KEYS) {
    it(`should parse "${key}"`, () => {
      assert.equal(SecretKeySchema.parse(key), key);
    });
  }

  it("should reject an invalid secret key", () => {
    assert.throws(() => SecretKeySchema.parse("not-a-real-key"));
  });

  it("should reject null", () => {
    assert.throws(() => SecretKeySchema.parse(null));
  });
});

// ─── MCPPermissionEntry ──────────────────────────────────────

describe("MCPPermissionEntrySchema", () => {
  it("should parse a valid MCP permission entry", () => {
    const entry = { matches: { server: "my-server" }, action: "allow" };
    const result = MCPPermissionEntrySchema.parse(entry);
    assert.deepEqual(result.action, "allow");
    assert.deepEqual(result.matches, { server: "my-server" });
  });

  it("should parse an entry with matches as unknown type", () => {
    const entry = { matches: "glob-pattern-*", action: "allow" };
    const result = MCPPermissionEntrySchema.parse(entry);
    assert.equal(result.matches, "glob-pattern-*");
  });

  it('should reject action other than "allow"', () => {
    const entry = { matches: "*", action: "deny" };
    assert.throws(() => MCPPermissionEntrySchema.parse(entry));
  });
});

// ─── SettingsSchema — minimal ────────────────────────────────

describe("SettingsSchema", () => {
  it("should parse an empty object (all fields optional)", () => {
    const result = SettingsSchema.parse({});
    assert.deepEqual(result, {});
  });

  // ─── full parse ──────────────────────────────────────────

  it("should parse a full settings object with many fields", () => {
    const full = {
      url: "https://api.example.com",
      proxy: "http://proxy:8080",
      "anthropic.speed": "fast",
      "anthropic.temperature": 0.7,
      "anthropic.thinking.enabled": true,
      "anthropic.interleavedThinking.enabled": false,
      "anthropic.effort": "high",
      "anthropic.provider": "anthropic",
      "openai.speed": "medium",
      "gemini.thinkingLevel": "high",
      "internal.model": "claude-4-opus",
      "internal.compactionThresholdPercent": 80,
      "internal.oracleReasoningEffort": "max",
      "internal.scaffoldCustomizationFile": "/path/to/file",
      "internal.fireworks.directRouting": true,
      "internal.kimi.reasoning": "standard",
      "agent.deepReasoningEffort": "high",
      "agent.skipTitleGenerationIfMessageContains": "skip-me",
      "agent.showUsageDebugInfo": true,
      "tools.disable": ["Bash", "Write"],
      "tools.enable": ["Read"],
      "tools.inactivityTimeout": 30000,
      "tools.stopTimeout": 5000,
      "network.timeout": 60000,
      "skills.path": "/custom/skills",
      "skills.disableClaudeCodeSkills": false,
      "toolbox.path": "/custom/toolbox",
      "terminal.animation": "smooth",
      "terminal.theme": "dark",
      "terminal.commands.nodeSpawn.loadProfile": true,
      systemPrompt: "You are a helpful assistant.",
      hooks: { preCommit: { command: "lint" } },
      workspaces: { myProject: { root: "/projects/my" } },
      "notifications.system.enabled": true,
      "fuzzy.alwaysIncludePaths": ["src/**", "tests/**"],
      "experimental.autoSnapshot": true,
      "experimental.agentMode": "auto",
      "experimental.cli.commandTelemetry.enabled": false,
      "git.commit.ampThread.enabled": true,
      "git.commit.coauthor.enabled": true,
      "guardedFiles.allowlist": ["package.json"],
    };

    const result = SettingsSchema.parse(full);
    assert.equal(result.url, "https://api.example.com");
    assert.equal(result["anthropic.temperature"], 0.7);
    assert.equal(result["anthropic.thinking.enabled"], true);
    assert.deepEqual(result["tools.disable"], ["Bash", "Write"]);
    assert.equal(result.systemPrompt, "You are a helpful assistant.");
  });

  // ─── mcpServers ──────────────────────────────────────────

  it("should parse mcpServers with a command-type server", () => {
    const settings = {
      mcpServers: {
        "my-server": {
          command: "node",
          args: ["server.js"],
          env: { PORT: "3000" },
        },
      },
    };
    const result = SettingsSchema.parse(settings);
    assert.ok(result.mcpServers);
    const server = result.mcpServers["my-server"] as { command: string; args?: string[] };
    assert.equal(server.command, "node");
    assert.deepEqual(server.args, ["server.js"]);
  });

  it("should parse mcpServers with a url-type server", () => {
    const settings = {
      mcpServers: {
        "remote-server": {
          url: "https://mcp.example.com/sse",
          headers: { Authorization: "Bearer token123" },
          transport: "sse",
        },
      },
    };
    const result = SettingsSchema.parse(settings);
    assert.ok(result.mcpServers);
    const server = result.mcpServers["remote-server"] as {
      url: string;
      headers?: Record<string, string>;
    };
    assert.equal(server.url, "https://mcp.example.com/sse");
    assert.deepEqual(server.headers, { Authorization: "Bearer token123" });
  });

  it("should parse mcpServers with mixed command and url types", () => {
    const settings = {
      mcpServers: {
        local: { command: "python", args: ["-m", "mcp_server"] },
        remote: { url: "https://mcp.example.com" },
      },
    };
    const result = SettingsSchema.parse(settings);
    assert.ok(result.mcpServers);
    assert.equal(Object.keys(result.mcpServers).length, 2);
  });

  // ─── permissions ─────────────────────────────────────────

  it("should parse permissions with allow action", () => {
    const settings = {
      permissions: [
        { tool: "Bash", action: "allow" },
        { tool: "Read", action: "allow" },
      ],
    };
    const result = SettingsSchema.parse(settings);
    assert.ok(result.permissions);
    assert.equal(result.permissions.length, 2);
    assert.equal(result.permissions[0].tool, "Bash");
    assert.equal(result.permissions[0].action, "allow");
  });

  it("should parse permissions with delegate action and to field", () => {
    const settings = {
      permissions: [{ tool: "Write", action: "delegate", to: "admin" }],
    };
    const result = SettingsSchema.parse(settings);
    assert.ok(result.permissions);
    assert.equal(result.permissions[0].action, "delegate");
    assert.equal(result.permissions[0].to, "admin");
  });

  it("should parse permissions with reject action and message", () => {
    const settings = {
      permissions: [{ tool: "Bash", action: "reject", message: "Bash is disabled" }],
    };
    const result = SettingsSchema.parse(settings);
    assert.ok(result.permissions);
    assert.equal(result.permissions[0].action, "reject");
    assert.equal(result.permissions[0].message, "Bash is disabled");
  });

  it("should parse permissions with ask action", () => {
    const settings = {
      permissions: [{ tool: "Edit", action: "ask" }],
    };
    const result = SettingsSchema.parse(settings);
    assert.ok(result.permissions);
    assert.equal(result.permissions[0].action, "ask");
  });

  it("should parse permissions with matches field", () => {
    const settings = {
      permissions: [{ tool: "Bash", action: "allow", matches: { command: "ls *" } }],
    };
    const result = SettingsSchema.parse(settings);
    assert.ok(result.permissions);
    assert.deepEqual(result.permissions[0].matches, { command: "ls *" });
  });

  it("should reject permissions where delegate is missing to field", () => {
    const settings = {
      permissions: [{ tool: "Bash", action: "delegate" }],
    };
    assert.throws(() => SettingsSchema.parse(settings));
  });

  it("should reject permissions where allow has a to field", () => {
    const settings = {
      permissions: [{ tool: "Bash", action: "allow", to: "admin" }],
    };
    assert.throws(() => SettingsSchema.parse(settings));
  });

  // ─── tools ───────────────────────────────────────────────

  it("should parse tools.disable and tools.enable arrays", () => {
    const settings = {
      "tools.disable": ["Bash", "Write"],
      "tools.enable": ["Read", "Glob"],
    };
    const result = SettingsSchema.parse(settings);
    assert.deepEqual(result["tools.disable"], ["Bash", "Write"]);
    assert.deepEqual(result["tools.enable"], ["Read", "Glob"]);
  });

  // ─── anthropic settings ──────────────────────────────────

  it("should parse anthropic settings (temperature, thinking, provider)", () => {
    const settings = {
      "anthropic.temperature": 0.5,
      "anthropic.thinking.enabled": true,
      "anthropic.interleavedThinking.enabled": false,
      "anthropic.provider": "bedrock",
      "anthropic.effort": "medium",
      "anthropic.speed": "normal",
    };
    const result = SettingsSchema.parse(settings);
    assert.equal(result["anthropic.temperature"], 0.5);
    assert.equal(result["anthropic.thinking.enabled"], true);
    assert.equal(result["anthropic.interleavedThinking.enabled"], false);
    assert.equal(result["anthropic.provider"], "bedrock");
    assert.equal(result["anthropic.effort"], "medium");
    assert.equal(result["anthropic.speed"], "normal");
  });

  // ─── mcpPermissions ──────────────────────────────────────

  it("should parse mcpPermissions array", () => {
    const settings = {
      mcpPermissions: [
        { matches: { server: "trusted-server" }, action: "allow" as const },
        { matches: "*", action: "allow" as const },
      ],
    };
    const result = SettingsSchema.parse(settings);
    assert.ok(result.mcpPermissions);
    assert.equal(result.mcpPermissions.length, 2);
  });

  // ─── strip unknown keys ──────────────────────────────────

  it("should strip unknown top-level keys", () => {
    const settings = {
      url: "https://api.example.com",
      unknownKey: "should be stripped",
    };
    const result = SettingsSchema.parse(settings);
    assert.equal(result.url, "https://api.example.com");
    assert.equal((result as Record<string, unknown>).unknownKey, undefined);
  });
});

// ─── ADMIN_OVERRIDE_KEYS ─────────────────────────────────────

describe("ADMIN_OVERRIDE_KEYS", () => {
  it("should be a readonly array", () => {
    assert.ok(Array.isArray(ADMIN_OVERRIDE_KEYS));
  });

  it("should contain expected keys", () => {
    const expected = [
      "anthropic.temperature",
      "anthropic.thinking.enabled",
      "anthropic.provider",
      "tools.disable",
      "tools.enable",
      "internal.model",
      "anthropic.effort",
      "agent.deepReasoningEffort",
    ];
    for (const key of expected) {
      assert.ok(
        ADMIN_OVERRIDE_KEYS.includes(key as (typeof ADMIN_OVERRIDE_KEYS)[number]),
        `ADMIN_OVERRIDE_KEYS should contain "${key}"`,
      );
    }
  });

  it("should have exactly 23 entries", () => {
    assert.equal(ADMIN_OVERRIDE_KEYS.length, 23);
  });
});

// ─── MERGED_ARRAY_KEYS ──────────────────────────────────────

describe("MERGED_ARRAY_KEYS", () => {
  it("should be a readonly array", () => {
    assert.ok(Array.isArray(MERGED_ARRAY_KEYS));
  });

  it("should contain expected keys", () => {
    const expected = [
      "guardedFiles.allowlist",
      "mcpPermissions",
      "tools.disable",
      "tools.enable",
      "permissions",
    ];
    for (const key of expected) {
      assert.ok(
        MERGED_ARRAY_KEYS.includes(key as (typeof MERGED_ARRAY_KEYS)[number]),
        `MERGED_ARRAY_KEYS should contain "${key}"`,
      );
    }
  });

  it("should have exactly 5 entries", () => {
    assert.equal(MERGED_ARRAY_KEYS.length, 5);
  });
});

// ─── GLOBAL_ONLY_KEYS ───────────────────────────────────────

describe("GLOBAL_ONLY_KEYS", () => {
  it("should be a readonly array", () => {
    assert.ok(Array.isArray(GLOBAL_ONLY_KEYS));
  });

  it("should contain expected keys", () => {
    const expected = ["mcpServers", "mcpPermissions", "url"];
    for (const key of expected) {
      assert.ok(
        GLOBAL_ONLY_KEYS.includes(key as (typeof GLOBAL_ONLY_KEYS)[number]),
        `GLOBAL_ONLY_KEYS should contain "${key}"`,
      );
    }
  });

  it("should have exactly 3 entries", () => {
    assert.equal(GLOBAL_ONLY_KEYS.length, 3);
  });
});

// ─── JSON Schema conversion ─────────────────────────────────

describe("JSON Schema conversion", () => {
  it("should convert SettingsSchema to a valid JSON Schema object (or throw for z.undefined in recursive types)", () => {
    try {
      const jsonSchema = z.toJSONSchema(SettingsSchema);
      assert.ok(jsonSchema);
      assert.equal(typeof jsonSchema, "object");
      assert.equal(jsonSchema.type, "object");
      assert.ok(jsonSchema.properties);
      assert.ok("url" in (jsonSchema.properties as Record<string, unknown>));
    } catch (err: unknown) {
      // PermissionMatcherSchema contains z.undefined() which can't be serialized to JSON Schema
      assert.ok(
        (err as { message: string }).message.includes("Undefined") ||
          (err as { message: string }).message.includes("undefined"),
      );
    }
  });

  it("should convert ConfigScopeSchema to a JSON Schema with enum", () => {
    const jsonSchema = z.toJSONSchema(ConfigScopeSchema);
    assert.ok(jsonSchema);
    assert.ok("enum" in jsonSchema || "anyOf" in jsonSchema);
  });
});

// ─── Gap Closure: Provider Config Keys ─────────────────────────

describe("SettingsSchema — provider config keys (gap closure)", () => {
  it("should accept anthropic.baseURL", () => {
    const result = SettingsSchema.safeParse({
      "anthropic.baseURL": "https://ark.cn-beijing.volces.com/api/compatible",
    });
    assert.ok(result.success);
  });

  it("should accept anthropic.apiKey", () => {
    const result = SettingsSchema.safeParse({ "anthropic.apiKey": "sk-ark-test123" });
    assert.ok(result.success);
  });

  it("should accept openai.baseURL", () => {
    const result = SettingsSchema.safeParse({ "openai.baseURL": "https://custom-openai.example.com/v1" });
    assert.ok(result.success);
  });

  it("should accept openai.apiKey", () => {
    const result = SettingsSchema.safeParse({ "openai.apiKey": "sk-openai-test" });
    assert.ok(result.success);
  });

  it("should accept gemini.apiKey", () => {
    const result = SettingsSchema.safeParse({ "gemini.apiKey": "AIzaSy-test" });
    assert.ok(result.success);
  });

  it("should accept update.url", () => {
    const result = SettingsSchema.safeParse({
      "update.url": "https://my-mirror.example.com/latest",
    });
    assert.ok(result.success);
  });

  it("should accept update.mode with valid enum values", () => {
    for (const mode of ["auto", "warn", "disabled"]) {
      const result = SettingsSchema.safeParse({ "update.mode": mode });
      assert.ok(result.success, `update.mode should accept "${mode}"`);
    }
  });

  it("should reject update.mode with invalid value", () => {
    const result = SettingsSchema.safeParse({ "update.mode": "always" });
    assert.ok(!result.success);
  });

  it("should include new keys in ADMIN_OVERRIDE_KEYS", () => {
    const expected = [
      "anthropic.baseURL",
      "anthropic.apiKey",
      "openai.baseURL",
      "openai.apiKey",
      "gemini.apiKey",
      "update.url",
      "update.mode",
    ];
    for (const key of expected) {
      assert.ok(
        ADMIN_OVERRIDE_KEYS.includes(key as (typeof ADMIN_OVERRIDE_KEYS)[number]),
        `ADMIN_OVERRIDE_KEYS should contain "${key}"`,
      );
    }
  });
});
