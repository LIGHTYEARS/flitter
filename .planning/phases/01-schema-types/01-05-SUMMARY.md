---
phase: 1
plan: 05
status: complete
---

# 工具权限 DSL — Summary

## One-Liner
Defined the complete tool permission DSL as Zod schemas with recursive PermissionMatcher, PermissionEntry with refine constraints for delegate/message rules, tool approval request/response types, and updated config.ts to use precise permission types.

## What Was Built
- `PermissionMatcherSchema` recursive type via `z.lazy()` supporting 7 leaf/composite forms: string (glob), boolean, number, null, undefined, array (OR, min 1), and Record (deep object matching)
- `PermissionActionSchema` enum: `allow`, `reject`, `ask`, `delegate`
- `PermissionContextSchema` enum: `thread`, `subagent`
- `PermissionEntrySchema` with 3 `.refine()` constraints:
  - `delegate` action requires non-empty `to` field
  - Non-delegate actions must not have `to` field
  - `message` field only allowed with `reject` action
- `PermissionEntryListSchema` for arrays of permission entries
- `ToolSourceSchema` union: `"builtin"` | `{ mcp: string }` | `{ toolbox: string }`
- `ToolRunInternalStatusSchema` enum (8 statuses) and `ToolRunDisplayStatusSchema` enum (5 statuses)
- `ToolEnableResultSchema` with enabled flag and optional `"settings"` disabled reason
- `ToolApprovalRequestSchema` with thread/tool context, matched rule, and rule source
- `ToolApprovalResponseSchema` union: accepted, feedback, rejected
- `PermissionCheckResultSchema` with permitted flag, reason, and action limited to ask/reject/delegate
- TypeScript helper interfaces (`PermissionMatcherArray`, `PermissionMatcherRecord`) to avoid TS2456 circular reference errors
- Updated `config.ts` to import and use `PermissionEntrySchema` for the `permissions` field (replacing `z.array(z.unknown())`)

## Key Decisions
- `PermissionMatcherSchema` uses `z.lazy()` with explicit `z.ZodType<PermissionMatcher>` annotation to satisfy TypeScript's recursive type requirements
- Array matcher enforces `min(1)` to prevent empty OR clauses that would match nothing
- Refine constraints implemented as chained `.refine()` calls on the base schema rather than `.superRefine()`, keeping each constraint isolated with specific error paths
- `ToolApprovalRequestSchema.matchedRule` uses the base schema (without refine) to allow storing any matched rule without re-validating constraints
- `PermissionCheckResultSchema.action` limited to `ask | reject | delegate` (not `allow`) since a check result only fires for non-allowed actions
- `z.undefined()` included in PermissionMatcher for completeness, though it means PermissionMatcherSchema cannot be fully converted to JSON Schema

## Test Coverage
57 test cases across 24 describe blocks covering:
- PermissionMatcher all 7 forms: string glob, boolean, number, null, undefined, array (OR), nested object
- Deeply nested object+array combinations
- Empty array rejection (min 1 constraint)
- All 4 PermissionAction values plus invalid action rejection
- PermissionContext thread/subagent plus invalid rejection
- PermissionEntry for each action type: allow, reject+message, ask, delegate+to
- Delegate constraint: missing to fails, non-delegate with to fails
- Message constraint: allow+message fails, ask+message fails, delegate+message fails
- Matches field with glob and nested object matchers
- Context field with thread and subagent
- PermissionEntryList with multiple rules and empty list
- ToolSource: builtin, mcp, toolbox variants plus unknown string rejection
- All 8 ToolRunInternalStatus values plus unknown rejection
- All 5 ToolRunDisplayStatus values plus unknown rejection
- ToolEnableResult enabled/disabled with invalid disabledReason rejection
- ToolApprovalRequest full and minimal
- ToolApprovalResponse all 3 variants plus empty object rejection
- PermissionCheckResult permitted/not-permitted, action enum restriction (rejects "allow")
- 5 negative tests: empty tool string, invalid action, invalid context, missing tool, missing action
- JSON Schema conversion for PermissionActionSchema, ToolEnableResultSchema, ToolRunDisplayStatusSchema, PermissionEntrySchema (graceful handling of refine)

## Artifacts
- `packages/schemas/src/permissions.ts`
- `packages/schemas/src/permissions.test.ts`
- `packages/schemas/src/config.ts` (updated `permissions` field to use `PermissionEntrySchema`)
- `packages/schemas/src/index.ts` (re-exports `./permissions`)
