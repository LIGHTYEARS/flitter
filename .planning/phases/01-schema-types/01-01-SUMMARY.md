---
phase: 1
plan: 01
status: complete
---

# LLM 消息类型 — Summary

## One-Liner
Defined the complete LLM message type system as Zod schemas, covering all message roles, 11 content block types, message states, tool run states, and usage tracking.

## What Was Built
- `MessageSchema` discriminated union on `role` with three variants: `UserMessage`, `AssistantMessage`, `InfoMessage`
- `UserContentBlockSchema` discriminated union (3 types): `TextBlock`, `ImageBlock`, `ToolResultBlock`
- `AssistantContentBlockSchema` discriminated union (5 types): `TextContentBlock`, `ToolUseBlock`, `ThinkingBlock`, `RedactedThinkingBlock`, `ServerToolUseBlock`
- `InfoContentBlockSchema` discriminated union (2 types): `ManualBashInvocationBlock`, `SummaryBlock`
- `ImageSourceSchema` discriminated union: `Base64Source` | `URLSource`
- `MessageStateSchema` discriminated union (4 states): `streaming`, `complete`, `cancelled`, `error`
- `ToolRunSchema` discriminated union (5 statuses): `done`, `error`, `cancelled`, `rejected-by-user`, `in-progress`
- `UsageSchema`, `MessageMetaSchema`, `FileMentionsSchema`, `CacheControlSchema`
- `NativeMessageSchema`, `UserStateSchema` as opaque record types
- All schemas export corresponding inferred TypeScript types via `z.infer`

## Key Decisions
- Used `z.discriminatedUnion` for all unions with a clear discriminant field (`role`, `type`, `status`), ensuring efficient runtime validation
- Nullable fields (`cacheCreationInputTokens`, `cacheReadInputTokens`) modeled with `z.number().nullable()` rather than optional, matching the source protocol exactly
- `NativeMessage` and `UserState` kept as opaque `z.record(z.string(), z.unknown())` since their internal structure varies by provider
- All optional fields use `.optional()` consistently; zero use of `any` type
- `ToolUseBlock.metadata` uses double `.optional()` (nested optional object with optional field) matching the source behavior

## Test Coverage
54 test cases across 13 describe blocks covering:
- Usage roundtrip including nullable cache fields and optional thinkingBudget
- All 5 ToolRun status variants with positive and boundary cases
- All 4 MessageState variants including all 3 stopReason values
- All 3 UserContentBlock types including cache_control and both image source types
- All 5 AssistantContentBlock types including openAIReasoning and timing fields
- All 2 InfoContentBlock types with hidden flag
- Full and minimal UserMessage, AssistantMessage, InfoMessage roundtrips
- MessageSchema role discrimination
- FileMentions with/without image info and imageBlocks
- 9 negative tests rejecting invalid roles, types, missing fields, wrong enums
- JSON Schema conversion for MessageSchema, UsageSchema, ToolRunSchema

## Artifacts
- `packages/schemas/src/messages.ts`
- `packages/schemas/src/messages.test.ts`
- `packages/schemas/src/index.ts` (re-exports `./messages`)
