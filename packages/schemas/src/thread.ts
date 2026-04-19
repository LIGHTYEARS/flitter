/**
 * @flitter/schemas — Thread 持久化 & DTW 状态 Zod Schema
 *
 * ThreadSnapshot、ThreadMessage、ConversationDelta、连接/压缩状态
 * 从 amp-cli-reversed/app/realtime-sync.js 提取
 */
import { z } from "zod";
import { ToolRunSchema, UsageSchema } from "./messages";

// ─── Guidance File Reference ───────────────────────────

export const GuidanceFileRefSchema = z.object({
  uri: z.string(),
  lineCount: z.number().int().nonnegative(),
  content: z.string().optional(),
});
export type GuidanceFileRef = z.infer<typeof GuidanceFileRefSchema>;

// ─── Thread Relationship ───────────────────────────────

export const ThreadRelationshipSchema = z.object({
  threadID: z.string(),
  type: z.literal("handoff"),
  messageIndex: z.number().optional(),
  blockIndex: z.number().optional(),
  comment: z.string().optional(),
});
export type ThreadRelationship = z.infer<typeof ThreadRelationshipSchema>;

// ─── Thread Meta / Environment ─────────────────────────

export const ThreadMetaSchema = z.object({
  status: z.string().optional(),
  executorType: z.string().optional(),
});
export type ThreadMeta = z.infer<typeof ThreadMetaSchema>;

export const ThreadEnvironmentSchema = z.object({
  initial: z
    .object({
      trees: z
        .array(
          z.object({
            repository: z.object({ url: z.string().optional() }).optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  trees: z.array(z.unknown()),
  platform: z.string(),
});
export type ThreadEnvironment = z.infer<typeof ThreadEnvironmentSchema>;

// ─── Thread Content Block (通用，线程快照层) ───────────

export const ThreadContentBlockSchema = z.union([
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({
    type: z.literal("tool_use"),
    id: z.string(),
    name: z.string(),
    input: z.record(z.string(), z.unknown()),
  }),
  z.object({
    type: z.literal("tool_result"),
    toolUseID: z.string(),
    output: z.string().optional(),
    status: z.string().optional(),
  }),
  z.object({ type: z.literal("thinking"), thinking: z.string() }),
  z.object({ type: z.literal("redacted_thinking"), data: z.string() }),
  z.object({
    type: z.literal("summary"),
    summary: z.object({ type: z.literal("message"), summary: z.string() }),
  }),
  z.object({
    type: z.literal("manual_bash_invocation"),
    args: z.record(z.string(), z.unknown()),
    toolRun: ToolRunSchema,
    hidden: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("server_tool_use"),
    id: z.string(),
    name: z.string(),
    input: z.unknown(),
  }),
  z.object({ type: z.literal("image"), source: z.unknown() }),
]);
export type ThreadContentBlock = z.infer<typeof ThreadContentBlockSchema>;

// ─── Thread Messages (role 判别) ───────────────────────

export const UserThreadMessageSchema = z.object({
  role: z.literal("user"),
  content: z.array(ThreadContentBlockSchema),
  messageId: z.number(),
  dtwMessageID: z.string().optional(),
  meta: z.object({ sentAt: z.number().optional() }).optional(),
  userState: z.record(z.string(), z.unknown()).optional(),
  readAt: z.number().optional(),
  agentMode: z.string().optional(),
  discoveredGuidanceFiles: z.array(GuidanceFileRefSchema).optional(),
  parentToolUseId: z.string().optional(),
});
export type UserThreadMessage = z.infer<typeof UserThreadMessageSchema>;

export const AssistantMessageStateSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("streaming") }),
  z.object({ type: z.literal("complete"), stopReason: z.enum(["end_turn", "tool_use"]) }),
  z.object({ type: z.literal("cancelled") }),
]);
export type AssistantMessageState = z.infer<typeof AssistantMessageStateSchema>;

export const AssistantThreadMessageSchema = z.object({
  role: z.literal("assistant"),
  content: z.array(ThreadContentBlockSchema),
  messageId: z.number(),
  dtwMessageID: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  usage: UsageSchema.optional(),
  readAt: z.number().optional(),
  state: AssistantMessageStateSchema,
  cancelled: z.boolean().optional(),
  parentToolUseId: z.string().optional(),
});
export type AssistantThreadMessage = z.infer<typeof AssistantThreadMessageSchema>;

export const InfoThreadMessageSchema = z.object({
  role: z.literal("info"),
  content: z.array(ThreadContentBlockSchema),
  messageId: z.number(),
  dtwMessageID: z.string().optional(),
  parentToolUseId: z.string().optional(),
});
export type InfoThreadMessage = z.infer<typeof InfoThreadMessageSchema>;

export const ThreadMessageSchema = z.discriminatedUnion("role", [
  UserThreadMessageSchema,
  AssistantThreadMessageSchema,
  InfoThreadMessageSchema,
]);
export type ThreadMessage = z.infer<typeof ThreadMessageSchema>;

// ─── Queued Message ────────────────────────────────────

export const QueuedMessageEntrySchema = z.object({
  id: z.string(),
  interrupt: z.boolean(),
  queuedMessage: UserThreadMessageSchema,
});
export type QueuedMessageEntry = z.infer<typeof QueuedMessageEntrySchema>;

// ─── Thread Snapshot (持久化根) ────────────────────────

export const ThreadSnapshotSchema = z.object({
  id: z.string(),
  v: z.number(),
  title: z.string().optional(),
  agentMode: z.string().optional(),
  messages: z.array(ThreadMessageSchema),
  queuedMessages: z.array(QueuedMessageEntrySchema).optional(),
  relationships: z.array(ThreadRelationshipSchema).optional(),
  nextMessageId: z.number().optional(),
  meta: ThreadMetaSchema.optional(),
  env: ThreadEnvironmentSchema.optional(),
  /** Thread labels for organization/filtering. 逆向: amp BKT() labels API */
  labels: z.array(z.string()).optional(),
  /** Whether this thread has been archived. 逆向: amp threadService.archive() */
  archived: z.boolean().optional(),
});
export type ThreadSnapshot = z.infer<typeof ThreadSnapshotSchema>;

// ─── Connection / Compaction State ─────────────────────

export const ConnectionStateSchema = z.enum([
  "connected",
  "reconnecting",
  "disconnected",
  "connecting",
  "authenticating",
]);
export type ConnectionState = z.infer<typeof ConnectionStateSchema>;

export const ReconnectCauseSchema = z.object({
  type: z.string(),
  at: z.number(),
  code: z.number().optional(),
  reason: z.string().optional(),
  error: z.string().optional(),
});
export type ReconnectCause = z.infer<typeof ReconnectCauseSchema>;

export const ConnectionInfoSchema = z.object({
  state: ConnectionStateSchema,
  role: z.enum(["executor", "observer"]).optional(),
  clientId: z.string().optional(),
  threadId: z.string().optional(),
  reconnectCause: ReconnectCauseSchema.optional(),
});
export type ConnectionInfo = z.infer<typeof ConnectionInfoSchema>;

export const CompactionStateSchema = z.enum(["idle", "compacting"]);
export type CompactionState = z.infer<typeof CompactionStateSchema>;

export const ConnectionModeSchema = z.enum(["observer", "executor+observer"]);
export type ConnectionMode = z.infer<typeof ConnectionModeSchema>;

// ─── Thread Summary (索引) ─────────────────────────────

export const ThreadSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  updatedAt: z.string(),
  description: z.object({
    timeAgo: z.string(),
    title: z.string(),
    shortThreadID: z.string(),
  }),
  diffStats: z.record(z.string(), z.unknown()).optional(),
  workspaceURI: z.string().optional(),
  relationships: z.array(ThreadRelationshipSchema).optional(),
  agentMode: z.string().optional(),
  details: z.object({ messageCount: z.number() }),
  archived: z.boolean().optional(),
});
export type ThreadSummary = z.infer<typeof ThreadSummarySchema>;

// ─── Conversation Delta (type 判别联合) ────────────────

export const ConversationDeltaCancelledSchema = z.object({ type: z.literal("cancelled") });
export const ConversationDeltaUserMessageSchema = z.object({
  type: z.literal("user:message"),
  message: z.record(z.string(), z.unknown()),
  index: z.number().optional(),
});
export const ConversationDeltaUserInterruptSchema = z.object({
  type: z.literal("user:message:interrupt"),
  messageIndex: z.number(),
});
export const ConversationDeltaUserAppendContentSchema = z.object({
  type: z.literal("user:message:append-content"),
  messageId: z.number(),
  content: z.unknown(),
});
export const ConversationDeltaUserEnqueueSchema = z.object({
  type: z.literal("user:message-queue:enqueue"),
  message: z.record(z.string(), z.unknown()),
});
export const ConversationDeltaUserDequeueSchema = z.object({
  type: z.literal("user:message-queue:dequeue"),
});
export const ConversationDeltaUserDiscardSchema = z.object({
  type: z.literal("user:message-queue:discard"),
  id: z.string().optional(),
});
export const ConversationDeltaUserToolInputSchema = z.object({
  type: z.literal("user:tool-input"),
  toolUse: z.string(),
  value: z.unknown(),
});
export const ConversationDeltaToolDataSchema = z.object({
  type: z.literal("tool:data"),
  toolUse: z.string(),
  data: z.unknown(),
});
export const ConversationDeltaToolProcessedSchema = z.object({
  type: z.literal("tool:processed"),
  toolUse: z.string(),
  newArgs: z.unknown(),
});
export const ConversationDeltaAssistantMessageSchema = z.object({
  type: z.literal("assistant:message"),
  message: z.record(z.string(), z.unknown()),
});
export const ConversationDeltaAssistantMessageUpdateSchema = z.object({
  type: z.literal("assistant:message-update"),
  message: z.record(z.string(), z.unknown()),
});
export const ConversationDeltaInferenceCompletedSchema = z.object({
  type: z.literal("inference:completed"),
  usage: UsageSchema.optional(),
  model: z.string().optional(),
});
export const ConversationDeltaTitleSchema = z.object({
  type: z.literal("title"),
  value: z.string(),
});
export const ConversationDeltaMaxTokensSchema = z.object({
  type: z.literal("max-tokens"),
  value: z.string(),
});
export const ConversationDeltaMainThreadSchema = z.object({
  type: z.literal("main-thread"),
  value: z.string(),
});
export const ConversationDeltaAgentModeSchema = z.object({
  type: z.literal("agent-mode"),
  mode: z.string(),
});
export const ConversationDeltaEnvironmentSchema = z.object({
  type: z.literal("environment"),
  env: z.unknown(),
});
export const ConversationDeltaTruncateSchema = z.object({
  type: z.literal("thread:truncate"),
  fromIndex: z.number(),
});
export const ConversationDeltaInfoBashSchema = z.object({
  type: z.literal("info:manual-bash-invocation"),
  args: z.unknown(),
  toolRun: z.unknown(),
  hidden: z.boolean().optional(),
});
export const ConversationDeltaClearPendingNavSchema = z.object({
  type: z.literal("clearPendingNavigation"),
});
export const ConversationDeltaSetPendingNavSchema = z.object({
  type: z.literal("setPendingNavigation"),
  threadID: z.string(),
});
export const ConversationDeltaRelationshipSchema = z.object({
  type: z.literal("relationship"),
  relationship: ThreadRelationshipSchema,
});
export const ConversationDeltaDraftSchema = z.object({
  type: z.literal("draft"),
  content: z.unknown(),
  autoSubmit: z.boolean().optional(),
});
export const ConversationDeltaTraceStartSchema = z.object({
  type: z.literal("trace:start"),
  span: z.unknown(),
});
export const ConversationDeltaTraceEndSchema = z.object({
  type: z.literal("trace:end"),
  span: z.unknown(),
});
export const ConversationDeltaTraceEventSchema = z.object({
  type: z.literal("trace:event"),
  span: z.unknown(),
  event: z.unknown(),
});
export const ConversationDeltaTraceAttributesSchema = z.object({
  type: z.literal("trace:attributes"),
  span: z.unknown(),
  attributes: z.unknown(),
});

export const ConversationDeltaSchema = z.discriminatedUnion("type", [
  ConversationDeltaCancelledSchema,
  ConversationDeltaUserMessageSchema,
  ConversationDeltaUserInterruptSchema,
  ConversationDeltaUserAppendContentSchema,
  ConversationDeltaUserEnqueueSchema,
  ConversationDeltaUserDequeueSchema,
  ConversationDeltaUserDiscardSchema,
  ConversationDeltaUserToolInputSchema,
  ConversationDeltaToolDataSchema,
  ConversationDeltaToolProcessedSchema,
  ConversationDeltaAssistantMessageSchema,
  ConversationDeltaAssistantMessageUpdateSchema,
  ConversationDeltaInferenceCompletedSchema,
  ConversationDeltaTitleSchema,
  ConversationDeltaMaxTokensSchema,
  ConversationDeltaMainThreadSchema,
  ConversationDeltaAgentModeSchema,
  ConversationDeltaEnvironmentSchema,
  ConversationDeltaTruncateSchema,
  ConversationDeltaInfoBashSchema,
  ConversationDeltaClearPendingNavSchema,
  ConversationDeltaSetPendingNavSchema,
  ConversationDeltaRelationshipSchema,
  ConversationDeltaDraftSchema,
  ConversationDeltaTraceStartSchema,
  ConversationDeltaTraceEndSchema,
  ConversationDeltaTraceEventSchema,
  ConversationDeltaTraceAttributesSchema,
]);
export type ConversationDelta = z.infer<typeof ConversationDeltaSchema>;
