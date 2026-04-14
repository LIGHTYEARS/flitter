---
phase: 11-cli-integration
plan: "06"
subsystem: "@flitter/flitter DI assembly"
tags: [di, container, service-container, factory, lifecycle]
dependency_graph:
  requires:
    - "@flitter/data (ConfigService, ThreadStore, ThreadPersistence, SkillService, ContextManager, GuidanceLoader)"
    - "@flitter/agent-core (ToolRegistry, ToolOrchestrator, PermissionEngine, ThreadWorker, builtin tools)"
    - "@flitter/llm (MCPServerManager)"
    - "@flitter/util (createLogger, Subject, BehaviorSubject)"
  provides:
    - "createContainer() async factory"
    - "ServiceContainer interface"
    - "SecretStorage interface"
    - "GuidanceLoader interface"
    - "10 factory functions for individual services"
  affects:
    - "packages/flitter/src/container.ts"
    - "packages/flitter/src/factory.ts"
    - "packages/flitter/src/index.ts"
tech_stack:
  added: []
  patterns:
    - "Functional DI container (createContainer returns object, not class)"
    - "Reverse-order dispose with error isolation"
    - "Factory functions per service (factory.ts)"
    - "Callback injection pattern for cross-package dependencies"
key_files:
  created:
    - "packages/flitter/src/container.ts"
    - "packages/flitter/src/factory.ts"
    - "packages/flitter/src/container.test.ts"
  modified:
    - "packages/flitter/src/index.ts"
decisions:
  - "KD-41: Functional createContainer() returns service object + asyncDispose(), not class-based DI"
  - "ToolSpec objects are constants (not classes), registered directly via registry.register(ReadTool)"
  - "GuidanceLoader wraps discoverGuidanceFiles with container-scoped config"
  - "Container-level ToolOrchestrator uses sentinel threadId for lifecycle management only"
  - "ContextManager created with no-op compactFn; real LLM compaction wired by ThreadWorker"
metrics:
  duration: "8m 5s"
  completed: "2026-04-14T04:40:43Z"
  tests: 21
  assertions: 49
---

# Phase 11 Plan 06: ServiceContainer DI Assembly Summary

Functional DI container assembling @flitter/data + @flitter/agent-core + @flitter/llm services with reverse-order async dispose and partial failure safety.

## What Was Built

### container.ts — Core Container
- `SecretStorage` interface: get/set/delete with optional scope for API keys and OAuth tokens
- `GuidanceLoader` interface: wraps `discoverGuidanceFiles` with container-scoped defaults
- `ContainerOptions` interface: ampURL, settings, secrets, deferAuth, workspaceRoot, dataDir, homeDir, configDir
- `ServiceContainer` interface: 12 service properties + createThreadWorker factory + asyncDispose
- `createContainer(opts)`: async factory that creates all services in dependency order, tracks disposables, handles partial failure cleanup

### factory.ts — Service Factory Functions
10 exported factory functions:
1. `createConfigService` — wraps ConfigService constructor with SecretStorage adapter
2. `createToolRegistry` — creates empty ToolRegistry
3. `registerBuiltinTools` — registers 7 builtin ToolSpec constants (Read/Write/Edit/Bash/Grep/Glob/FuzzyFind)
4. `createPermissionEngine` — creates PermissionEngine with config callback + Subject for approvals
5. `createMCPServerManager` — creates MCPServerManager with config-derived mcpServers getter
6. `createSkillService` — creates SkillService with workspaceRoot + userConfigDir
7. `createGuidanceLoader` — returns GuidanceLoader wrapping discoverGuidanceFiles
8. `createThreadStore` — creates ThreadStore with defaults
9. `createThreadPersistence` — creates ThreadPersistence if dataDir provided, else null
10. `createContextManager` — creates ContextManager with no-op compactFn placeholder

### index.ts — Barrel Exports
Exports container types and all factory functions for both standard and advanced usage.

## Test Coverage (21 tests, 49 assertions)

| Test | Verifies |
|------|----------|
| Returns all service properties | All 12 properties + 2 methods defined |
| Config passing | ampURL/workspaceRoot correctly propagated |
| secrets/settings exposure | Direct reference equality |
| 7 builtin tools registered | Read/Write/Edit/Bash/Grep/Glob/FuzzyFind present |
| threadPersistence null without dataDir | Optional dataDir handling |
| threadPersistence created with dataDir | Non-null when dataDir provided |
| Reverse-order dispose | No errors during cleanup |
| Dispose error isolation | One service failure doesn't block others |
| Multiple asyncDispose calls | Idempotent, no throw on second call |
| createThreadWorker factory | Returns ThreadWorker with inferenceState$/events$ |
| configService with secrets | Config object properly initialized |
| threadStore created | observeThreadEntries function available |
| contextManager created | compactionState BehaviorSubject available |
| skillService created | skills BehaviorSubject available |
| guidanceLoader discover | discover() function available |
| permissionEngine created | Instance exists |
| mcpServerManager created | allTools$ BehaviorSubject available |
| toolOrchestrator created | Instance exists |
| deferAuth flag | Container creates normally with deferAuth=true |
| SecretStorage get/set/delete | Basic CRUD operations |
| SecretStorage with scope | Scope parameter accepted |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ToolSpec objects are constants, not classes**
- **Found during:** GREEN phase
- **Issue:** Plan reference code used `new ReadTool()` but actual exports are `const ReadTool: ToolSpec = {...}` (object constants)
- **Fix:** Changed `registry.register(new ReadTool())` to `registry.register(ReadTool)` for all 7 tools
- **Files modified:** packages/flitter/src/factory.ts
- **Commit:** 8574cac

**2. [Rule 1 - Bug] ThreadStore has no allEntries$ property**
- **Found during:** GREEN phase
- **Issue:** Test referenced `container.threadStore.allEntries$` but actual API is `observeThreadEntries()` method
- **Fix:** Changed test assertion to check `typeof observeThreadEntries === "function"`
- **Files modified:** packages/flitter/src/container.test.ts
- **Commit:** 8574cac

**3. [Rule 2 - Missing] GuidanceLoader interface**
- **Found during:** Implementation
- **Issue:** `@flitter/data` exports `discoverGuidanceFiles` as standalone function, not a `GuidanceLoader` class
- **Fix:** Created `GuidanceLoader` interface with `discover()` method, wrapping discoverGuidanceFiles with container-scoped defaults
- **Files modified:** packages/flitter/src/container.ts, packages/flitter/src/factory.ts
- **Commit:** 8574cac

## Commits

| Hash | Type | Message |
|------|------|---------|
| 56775a3 | test | add failing tests for ServiceContainer DI assembly |
| 8574cac | feat | implement ServiceContainer DI assembly layer |

## Known Stubs

| File | Line | Stub | Reason |
|------|------|------|--------|
| factory.ts | 172 | `compactFn: async () => ""` | ContextManager placeholder; real LLM compaction wired when ThreadWorker connects to a provider |
| container.ts | 188-197 | noopCallbacks in container-level ToolOrchestrator | Sentinel orchestrator for lifecycle only; per-thread orchestrators created by createThreadWorker |

Both stubs are intentional design — they are wired to real implementations at the ThreadWorker level (Plan 11-02/11-03 scope).

## Self-Check: PASSED
