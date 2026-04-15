---
phase: 1
plan: 03
status: complete
---

# 配置系统 — Summary

## One-Liner
Defined the three-level configuration system as Zod schemas and TypeScript interfaces, covering 45+ settings keys with precise types, config scope enums, secret key management, and the ConfigService interface.

## What Was Built
- `ConfigScopeSchema` enum: `default`, `global`, `workspace`, `admin`, `override`
- `SecretKeySchema` enum with 7 secret key types (apiKey, various access tokens, OAuth secrets)
- `ADMIN_OVERRIDE_KEYS` constant (22 keys that admin scope can override)
- `MERGED_ARRAY_KEYS` constant (5 keys using concat+dedup merge strategy)
- `GLOBAL_ONLY_KEYS` constant (3 keys restricted to global scope)
- `MCPPermissionEntrySchema` simplified schema for MCP-level permissions
- `SettingsSchema` with 45+ optional fields organized by category: auth/API, Anthropic, OpenAI, Gemini, update, internal, agent, tools, MCP, permissions, skills, terminal, and experimental
- `SecretStore` interface with async `getToken` and sync `isSet` methods
- `Config` interface combining settings and secrets
- `ConfigService` interface with full CRUD: `get`, `updateSettings`, `appendSettings`, `prependSettings`, `deleteSettings`, `updateSecret`, plus workspace/home/config directory paths

## Key Decisions
- All Settings fields are optional since any subset can be specified per scope level
- `mcpServers` field reuses `MCPServerSpecSchema` from mcp.ts for type consistency
- `permissions` field uses `PermissionEntrySchema` from permissions.ts (upgraded from `z.unknown()` placeholder after Plan 05)
- `Config` and `ConfigService` defined as pure TypeScript interfaces (not Zod schemas) because they contain async methods not representable in Zod
- `update.mode` uses `z.enum(["auto", "warn", "disabled"])` for strict validation
- Provider-specific keys (anthropic.baseURL, anthropic.apiKey, openai.baseURL, openai.apiKey, gemini.apiKey) added to support multi-provider configuration
- Unknown top-level keys are stripped by Zod's default object parsing behavior

## Test Coverage
49 test cases across 9 describe blocks covering:
- All 5 ConfigScope values plus invalid scope rejection
- All 7 SecretKey values plus invalid key rejection
- Empty settings object (all optional), full settings with 35+ fields, partial settings by category
- mcpServers with command-type, URL-type, and mixed server specs
- Permissions with allow, reject+message, ask, delegate+to, and matches field
- Delegate constraint validation (missing to, non-delegate with to)
- tools.disable/enable arrays, anthropic settings group, mcpPermissions array
- Unknown key stripping behavior
- ADMIN_OVERRIDE_KEYS (22 entries), MERGED_ARRAY_KEYS (5 entries), GLOBAL_ONLY_KEYS (3 entries) constant validation
- JSON Schema conversion for SettingsSchema and ConfigScopeSchema
- Gap-closure tests for provider config keys and update.mode enum

## Artifacts
- `packages/schemas/src/config.ts`
- `packages/schemas/src/config.test.ts`
- `packages/schemas/src/index.ts` (re-exports `./config`)
