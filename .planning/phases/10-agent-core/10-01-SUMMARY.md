---
phase: 10
plan: 01
status: complete
---

# Tool System Core Types & Registry — Summary

## One-Liner
Defined the foundational type contracts (ToolSpec, ToolResult, ToolContext, ExecutionProfile, ResourceKey) and implemented a ToolRegistry class for tool CRUD, filtering, and name normalization.

## What Was Built
- `ToolSpec` interface with all required fields: name, description, inputSchema, execute (returns `Promise<ToolResult> | Observable<ToolResult>`), source (`ToolSource`), plus optional executionProfile, isReadOnly, isEnabled
- `ResourceKey` interface (key + read/write mode) and `ExecutionProfile` interface (serial flag + resourceKeys)
- `ToolResult` interface with status (`ToolRunInternalStatus`), content, error, data, outputFiles
- `ToolContext` interface with workingDirectory, signal, threadId, config, toolMessages, userInput
- `ToolRegistry` class with register/unregister/get/has/list/listEnabled/getToolDefinitions/normalizeToolName
- Re-export of `ToolDefinition` from `@flitter/llm`

## Key Decisions
- `ToolRegistry` uses `Map<string, ToolSpec>` for O(1) lookup
- `listEnabled` implements three-level filtering: spec.isEnabled check, config `tools.disable` list, config `tools.enable` whitelist
- `normalizeToolName` strips `mcp__server__` prefix (splits on `__`, takes from index 2 onward)
- Registry throws on duplicate name registration rather than silently overwriting
- Used `readonly` modifier on the internal Map to prevent external mutation

## Test Coverage
23 tests in `registry.test.ts` covering: register (duplicate rejection, multi-tool coexistence), unregister (return value, post-removal state), get/has (missing tool), list (empty/populated), listEnabled (isEnabled, disable list, enable whitelist, combination filtering), getToolDefinitions (shape, filtering, empty), normalizeToolName (plain names, mcp prefix variants).

## Artifacts
- `packages/agent-core/src/tools/types.ts`
- `packages/agent-core/src/tools/registry.ts`
- `packages/agent-core/src/tools/registry.test.ts`
