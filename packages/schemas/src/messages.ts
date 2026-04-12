/**
 * @flitter/schemas — LLM 消息类型 Zod Schema
 *
 * 定义所有 LLM 消息角色、内容块、状态和 Usage 类型
 * 从 amp-cli-reversed/app/llm-sdk-providers.js 和 conversation-ui-logic.js 提取
 */
import { z } from "zod";

// ─── 基础类型 ───────────────────────────────────────────

export const CacheControlSchema = z.object({
  type: z.literal("ephemeral"),
  ttl: z.string(),
});
export type CacheControl = z.infer<typeof CacheControlSchema>;

export const Base64SourceSchema = z.object({
  type: z.literal("base64"),
  mediaType: z.string(),
  data: z.string(),
});
export type Base64Source = z.infer<typeof Base64SourceSchema>;

export const URLSourceSchema = z.object({
  type: z.literal("url"),
  url: z.string(),
});
export type URLSource = z.infer<typeof URLSourceSchema>;

export const ImageSourceSchema = z.discriminatedUnion("type", [
  Base64SourceSchema,
  URLSourceSchema,
]);
export type ImageSource = z.infer<typeof ImageSourceSchema>;

// ─── Usage ──────────────────────────────────────────────

export const UsageSchema = z.object({
  model: z.string(),
  maxInputTokens: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheCreationInputTokens: z.number().nullable(),
  cacheReadInputTokens: z.number().nullable(),
  totalInputTokens: z.number(),
  thinkingBudget: z.number().optional(),
  timestamp: z.string(),
});
export type Usage = z.infer<typeof UsageSchema>;

// ─── MessageMeta ────────────────────────────────────────

export const MessageMetaSchema = z.object({
  sentAt: z.number().optional(),
  fromAggman: z.literal(true).optional(),
  fromExecutorThreadID: z.string().optional(),
});
export type MessageMeta = z.infer<typeof MessageMetaSchema>;

// ─── ToolRun (status 判别联合) ──────────────────────────

export const ToolRunDoneSchema = z.object({
  status: z.literal("done"),
  result: z.unknown().optional(),
  progress: z.unknown().optional(),
  trackFiles: z.array(z.string()).optional(),
});

export const ToolRunErrorSchema = z.object({
  status: z.literal("error"),
  error: z.object({
    message: z.string(),
    errorCode: z.string().optional(),
  }),
});

export const ToolRunCancelledSchema = z.object({
  status: z.literal("cancelled"),
  reason: z.string().optional(),
});

export const ToolRunRejectedSchema = z.object({
  status: z.literal("rejected-by-user"),
  reason: z.string().optional(),
});

export const ToolRunInProgressSchema = z.object({
  status: z.literal("in-progress"),
  progress: z.unknown().optional(),
});

export const ToolRunSchema = z.discriminatedUnion("status", [
  ToolRunDoneSchema,
  ToolRunErrorSchema,
  ToolRunCancelledSchema,
  ToolRunRejectedSchema,
  ToolRunInProgressSchema,
]);
export type ToolRun = z.infer<typeof ToolRunSchema>;

// ─── MessageState (type 判别联合) ───────────────────────

export const MessageStateStreamingSchema = z.object({
  type: z.literal("streaming"),
});

export const MessageStateCompleteSchema = z.object({
  type: z.literal("complete"),
  stopReason: z.enum(["end_turn", "tool_use", "max_tokens"]),
});

export const MessageStateCancelledSchema = z.object({
  type: z.literal("cancelled"),
});

export const MessageStateErrorSchema = z.object({
  type: z.literal("error"),
  error: z.object({ message: z.string() }),
});

export const MessageStateSchema = z.discriminatedUnion("type", [
  MessageStateStreamingSchema,
  MessageStateCompleteSchema,
  MessageStateCancelledSchema,
  MessageStateErrorSchema,
]);
export type MessageState = z.infer<typeof MessageStateSchema>;

// ─── User Content Blocks (type 判别联合) ────────────────

export const TextBlockSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  cache_control: CacheControlSchema.optional(),
});

export const ImageBlockSchema = z.object({
  type: z.literal("image"),
  source: ImageSourceSchema,
  sourcePath: z.string().optional(),
  cache_control: CacheControlSchema.optional(),
});

export const ToolResultBlockSchema = z.object({
  type: z.literal("tool_result"),
  toolUseID: z.string(),
  run: ToolRunSchema,
  userInput: z.unknown().optional(),
  cache_control: CacheControlSchema.optional(),
});

export const UserContentBlockSchema = z.discriminatedUnion("type", [
  TextBlockSchema,
  ImageBlockSchema,
  ToolResultBlockSchema,
]);
export type UserContentBlock = z.infer<typeof UserContentBlockSchema>;

// ─── Assistant Content Blocks (type 判别联合) ───────────

export const TextContentBlockSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  startTime: z.number().optional(),
  finalTime: z.number().optional(),
});

export const ToolUseBlockSchema = z.object({
  type: z.literal("tool_use"),
  id: z.string(),
  name: z.string(),
  complete: z.boolean(),
  input: z.record(z.string(), z.unknown()),
  inputPartialJSON: z.object({ json: z.string() }).optional(),
  inputIncomplete: z.record(z.string(), z.unknown()).optional(),
  startTime: z.number().optional(),
  finalTime: z.number().optional(),
  metadata: z.object({ thoughtSignature: z.string() }).optional().optional(),
});

export const ThinkingBlockSchema = z.object({
  type: z.literal("thinking"),
  thinking: z.string(),
  signature: z.string(),
  provider: z.enum(["anthropic", "vertexai", "openai"]).optional(),
  openAIReasoning: z.object({
    id: z.string(),
    encryptedContent: z.string(),
  }).optional(),
  startTime: z.number().optional(),
  finalTime: z.number().optional(),
});

export const RedactedThinkingBlockSchema = z.object({
  type: z.literal("redacted_thinking"),
  data: z.string(),
  provider: z.enum(["anthropic", "vertexai", "openai"]).optional(),
  startTime: z.number().optional(),
  finalTime: z.number().optional(),
});

export const ServerToolUseBlockSchema = z.object({
  type: z.literal("server_tool_use"),
  id: z.string(),
  name: z.string(),
  input: z.unknown(),
  startTime: z.number().optional(),
  finalTime: z.number().optional(),
});

export const AssistantContentBlockSchema = z.discriminatedUnion("type", [
  TextContentBlockSchema,
  ToolUseBlockSchema,
  ThinkingBlockSchema,
  RedactedThinkingBlockSchema,
  ServerToolUseBlockSchema,
]);
export type AssistantContentBlock = z.infer<typeof AssistantContentBlockSchema>;

// ─── Info Content Blocks (type 判别联合) ────────────────

export const ManualBashInvocationBlockSchema = z.object({
  type: z.literal("manual_bash_invocation"),
  args: z.object({
    cmd: z.string(),
    cwd: z.string().optional(),
  }),
  toolRun: ToolRunSchema,
  hidden: z.boolean().optional(),
});

export const SummaryBlockSchema = z.object({
  type: z.literal("summary"),
  summary: z.object({
    type: z.literal("message"),
    summary: z.string(),
  }),
});

export const InfoContentBlockSchema = z.discriminatedUnion("type", [
  ManualBashInvocationBlockSchema,
  SummaryBlockSchema,
]);
export type InfoContentBlock = z.infer<typeof InfoContentBlockSchema>;

// ─── FileMentions ───────────────────────────────────────

export const FileMentionFileSchema = z.object({
  uri: z.string(),
  content: z.string(),
  isImage: z.boolean(),
  imageInfo: z.object({
    mimeType: z.string(),
    size: z.number(),
  }).optional(),
});

export const FileMentionsSchema = z.object({
  files: z.array(FileMentionFileSchema),
  mentions: z.array(z.object({ uri: z.string() })),
  imageBlocks: z.array(ImageBlockSchema).optional(),
});
export type FileMentions = z.infer<typeof FileMentionsSchema>;

// ─── NativeMessage (opaque) ─────────────────────────────

export const NativeMessageSchema = z.record(z.string(), z.unknown());
export type NativeMessage = z.infer<typeof NativeMessageSchema>;

// ─── UserState ──────────────────────────────────────────

export const UserStateSchema = z.record(z.string(), z.unknown());
export type UserState = z.infer<typeof UserStateSchema>;

// ─── Messages (role 判别联合) ───────────────────────────

export const UserMessageSchema = z.object({
  role: z.literal("user"),
  messageId: z.number(),
  content: z.array(UserContentBlockSchema),
  dtwMessageID: z.string().optional(),
  interrupted: z.boolean().optional(),
  fileMentions: FileMentionsSchema.optional(),
  userState: UserStateSchema.optional(),
  discoveredGuidanceFiles: z.array(z.string()).optional(),
  agentMode: z.string().optional(),
  meta: MessageMetaSchema.optional(),
  readAt: z.number().optional(),
  originalToolUseInput: z.record(z.string(), z.unknown()).optional(),
  parentToolUseId: z.string().optional(),
});
export type UserMessage = z.infer<typeof UserMessageSchema>;

export const AssistantMessageSchema = z.object({
  role: z.literal("assistant"),
  messageId: z.number(),
  content: z.array(AssistantContentBlockSchema),
  state: MessageStateSchema,
  usage: UsageSchema.optional(),
  dtwMessageID: z.string().optional(),
  readAt: z.number().optional(),
  nativeMessage: NativeMessageSchema.optional(),
  meta: z.object({
    openAIResponsePhase: z.enum(["commentary", "final_answer"]).optional(),
  }).optional(),
  parentToolUseId: z.string().optional(),
});
export type AssistantMessage = z.infer<typeof AssistantMessageSchema>;

export const InfoMessageSchema = z.object({
  role: z.literal("info"),
  messageId: z.number(),
  content: z.array(InfoContentBlockSchema),
  dtwMessageID: z.string().optional(),
});
export type InfoMessage = z.infer<typeof InfoMessageSchema>;

export const MessageSchema = z.discriminatedUnion("role", [
  UserMessageSchema,
  AssistantMessageSchema,
  InfoMessageSchema,
]);
export type Message = z.infer<typeof MessageSchema>;
