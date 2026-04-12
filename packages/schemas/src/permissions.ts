/**
 * @flitter/schemas — 工具权限 DSL Zod Schema
 *
 * PermissionEntry、递归 PermissionMatcher、工具审批请求/响应、工具启用/禁用状态
 * 从 amp-cli-reversed/vendor/esm/message-schemas.js 和 app/tool-permissions.js 提取
 */
import { z } from "zod";

// ─── PermissionMatcher (递归联合，z.lazy) ────────────────

/**
 * 递归权限匹配器类型
 *
 * - string: Glob 模式 ("*" 匹配任意，"/regex/" 正则，精确字符串)
 * - PermissionMatcher[]: OR 匹配 (至少 1 个元素)
 * - boolean: 字面量布尔匹配
 * - number: 字面量数字匹配
 * - null: 字面量 null 匹配
 * - undefined: 字面量 undefined 匹配
 * - Record<string, PermissionMatcher>: 对象键深度匹配
 *
 * @example
 * const matcher = PermissionMatcherSchema.parse("*.ts");
 * const nested = PermissionMatcherSchema.parse({ path: "*.ts", recursive: true });
 */
/**
 * PermissionMatcher 递归类型
 *
 * - string: Glob 模式 ("*" 匹配任意，"/regex/" 正则，精确字符串)
 * - PermissionMatcher[]: OR 匹配 (至少 1 个元素)
 * - boolean: 字面量布尔匹配
 * - number: 字面量数字匹配
 * - null: 字面量 null 匹配
 * - undefined: 字面量 undefined 匹配
 * - Record<string, PermissionMatcher>: 对象键深度匹配
 *
 * 用 interface 规避 TS2456 循环引用
 */
type PermissionMatcherLeaf = string | boolean | number | null | undefined;

/** 递归权限匹配器 — 用 interface 规避 TS2456 循环引用 */
export interface PermissionMatcherArray extends Array<PermissionMatcher> {}
export interface PermissionMatcherRecord extends Record<string, PermissionMatcher> {}

export type PermissionMatcher =
  | PermissionMatcherLeaf
  | PermissionMatcherArray
  | PermissionMatcherRecord;

export const PermissionMatcherSchema: z.ZodType<PermissionMatcher> = z.lazy(() =>
  z.union([
    z.string(),
    z.array(PermissionMatcherSchema).min(1),
    z.boolean(),
    z.number(),
    z.null(),
    z.undefined(),
    z.record(z.string(), PermissionMatcherSchema),
  ]),
);

// ─── Permission Action / Context ────────────────────────

export const PermissionActionSchema = z.enum(["allow", "reject", "ask", "delegate"]);
export type PermissionAction = z.infer<typeof PermissionActionSchema>;

export const PermissionContextSchema = z.enum(["thread", "subagent"]);
export type PermissionContext = z.infer<typeof PermissionContextSchema>;

// ─── PermissionEntry (核心，含 refine 约束) ─────────────

const PermissionEntryBaseSchema = z.object({
  tool: z.string().min(1),
  matches: z.record(z.string(), PermissionMatcherSchema).optional(),
  action: PermissionActionSchema,
  context: PermissionContextSchema.optional(),
  to: z.string().min(1).optional(),
  message: z.string().optional(),
});

export const PermissionEntrySchema = PermissionEntryBaseSchema
  .refine(
    (entry) => entry.action !== "delegate" || (entry.to !== undefined && entry.to !== ""),
    { message: "action 'delegate' requires 'to' field", path: ["to"] },
  )
  .refine(
    (entry) => entry.action === "delegate" || entry.to === undefined,
    { message: "'to' field only allowed with action 'delegate'", path: ["to"] },
  )
  .refine(
    (entry) => entry.action === "reject" || entry.message === undefined,
    { message: "'message' field only allowed with action 'reject'", path: ["message"] },
  );

export type PermissionEntry = z.infer<typeof PermissionEntrySchema>;

export const PermissionEntryListSchema = z.array(PermissionEntrySchema);
export type PermissionEntryList = z.infer<typeof PermissionEntryListSchema>;

// ─── Tool Source ────────────────────────────────────────

export const ToolSourceSchema = z.union([
  z.literal("builtin"),
  z.object({ mcp: z.string() }),
  z.object({ toolbox: z.string() }),
]);
export type ToolSource = z.infer<typeof ToolSourceSchema>;

// ─── Tool Run Status Mappings ───────────────────────────

export const ToolRunInternalStatusSchema = z.enum([
  "done",
  "error",
  "cancelled",
  "cancellation-requested",
  "rejected-by-user",
  "in-progress",
  "queued",
  "blocked-on-user",
]);
export type ToolRunInternalStatus = z.infer<typeof ToolRunInternalStatusSchema>;

export const ToolRunDisplayStatusSchema = z.enum([
  "done",
  "error",
  "cancelled",
  "running",
  "pending",
]);
export type ToolRunDisplayStatus = z.infer<typeof ToolRunDisplayStatusSchema>;

// ─── Tool Enable Result ─────────────────────────────────

export const ToolEnableResultSchema = z.object({
  enabled: z.boolean(),
  disabledReason: z.literal("settings").optional(),
});
export type ToolEnableResult = z.infer<typeof ToolEnableResultSchema>;

// ─── Tool Approval Request ──────────────────────────────

export const ToolApprovalRequestSchema = z.object({
  threadId: z.string(),
  mainThreadId: z.string(),
  toolUseId: z.string(),
  toolName: z.string(),
  args: z.record(z.string(), z.unknown()),
  reason: z.string(),
  toAllow: z.string().optional(),
  context: PermissionContextSchema,
  subagentToolName: z.string().optional(),
  parentToolUseId: z.string().optional(),
  matchedRule: PermissionEntryBaseSchema.optional(),
  ruleSource: z.string().optional(),
});
export type ToolApprovalRequest = z.infer<typeof ToolApprovalRequestSchema>;

// ─── Tool Approval Response (联合) ──────────────────────

export const ToolApprovalAcceptedSchema = z.object({ accepted: z.literal(true) });
export const ToolApprovalFeedbackSchema = z.object({ feedback: z.string() });
export const ToolApprovalRejectedSchema = z.object({ accepted: z.literal(false) });

export const ToolApprovalResponseSchema = z.union([
  ToolApprovalAcceptedSchema,
  ToolApprovalFeedbackSchema,
  ToolApprovalRejectedSchema,
]);
export type ToolApprovalResponse = z.infer<typeof ToolApprovalResponseSchema>;

// ─── Permission Check Result ────────────────────────────

export const PermissionCheckResultSchema = z.object({
  permitted: z.boolean(),
  reason: z.string(),
  action: z.enum(["ask", "reject", "delegate"]),
  error: z.string().optional(),
  matchedEntry: PermissionEntryBaseSchema.optional(),
  source: z.string().optional(),
});
export type PermissionCheckResult = z.infer<typeof PermissionCheckResultSchema>;
