/**
 * Permission DSL Matcher — Glob 模式匹配、工具启用/禁用、递归权限匹配
 *
 * 为权限执行引擎 (engine.ts) 提供底层匹配原语
 * 逆向: tool-permissions.js 的 Vf, Xf, yy + 递归匹配逻辑
 */
import type {
  PermissionEntry,
  PermissionMatcher,
  Settings,
  ToolEnableResult,
} from "@flitter/schemas";

// ─── Glob → Regex 转换 ─────────────────────────────────

/**
 * 将 glob 模式转换为正则表达式 (自实现, 不依赖 picomatch)
 *
 * 转换规则:
 * - `**` → `.*` (匹配任意字符包括分隔符)
 * - `*`  → `[^/]*` (匹配除 / 外的任意字符)
 * - `?`  → `[^/]` (匹配单个非 / 字符)
 * - 其他特殊正则字符转义: . + ^ $ { } | ( ) [ ] \
 *
 * 注意: 先处理 ** 再处理 *, 避免 ** 被拆成两个 *
 * 返回的 RegExp 使用 'i' 标志 (大小写不敏感)
 */
function globToRegex(pattern: string): RegExp {
  // 1. 用占位符保护 ** (双星), 必须在单星替换前进行
  let result = pattern.replace(/\*\*/g, "\0DOUBLESTAR\0");

  // 2. 转义所有正则特殊字符 (除 * 和 ? 外)
  result = result.replace(/[.+^${}()|[\]\\]/g, "\\$&");

  // 3. 替换剩余单 * → [^/]* (先于 DOUBLESTAR 展开, 避免 .* 中的 * 被替换)
  result = result.replace(/\*/g, "[^/]*");

  // 4. 替换 ? → [^/]
  result = result.replace(/\?/g, "[^/]");

  // 5. 最后展开 DOUBLESTAR → .* (此时单星已处理完毕)
  result = result.replace(/\0DOUBLESTAR\0/g, ".*");

  return new RegExp(`^${result}$`, "i");
}

// ─── 工具名 Glob 匹配 ──────────────────────────────────

/**
 * 匹配工具名是否符合 glob 模式
 * 逆向: Vf (matchToolPattern)
 */
export function matchToolPattern(pattern: string, toolName: string): boolean {
  const regex = globToRegex(pattern);
  return regex.test(toolName);
}

// ─── 禁用列表匹配 ──────────────────────────────────────

/**
 * 检查工具名是否匹配禁用列表中的任意模式
 * 逆向: Xf (matchDisablePattern)
 */
export function matchDisablePattern(patterns: string[], toolName: string): boolean {
  return patterns.some((pattern) => matchToolPattern(pattern, toolName));
}

// ─── 工具启用检查 ──────────────────────────────────────

/**
 * 三步评估工具是否启用
 * 逆向: yy (checkToolEnabled)
 *
 * 评估顺序:
 * 1. 如果 config["tools.disable"] 包含匹配模式 → disabled (reason: "settings")
 * 2. 如果上一步 disabled 且 config["tools.enable"] 包含匹配模式 → 重新启用
 * 3. 默认: enabled
 */
export function checkToolEnabled(toolName: string, config: Settings): ToolEnableResult {
  const disablePatterns = config["tools.disable"] ?? [];
  const enablePatterns = config["tools.enable"] ?? [];

  // Step 1: 检查禁用列表
  const isDisabled = matchDisablePattern(disablePatterns, toolName);

  if (isDisabled) {
    // Step 2: 检查启用列表是否覆盖禁用
    const isReEnabled = matchDisablePattern(enablePatterns, toolName);
    if (isReEnabled) {
      return { enabled: true };
    }
    return { enabled: false, disabledReason: "settings" };
  }

  // Step 3: 默认启用
  return { enabled: true };
}

// ─── 递归权限匹配器 ────────────────────────────────────

/**
 * 递归匹配 PermissionMatcher 与实际值
 * 逆向: tool-permissions.js ~160-230 的递归匹配逻辑
 *
 * 匹配规则:
 * - string: /regex/ 包裹时正则匹配, 否则 glob 匹配 (仅对 string value)
 * - boolean/number/null: 严格相等 (===)
 * - undefined: value === undefined 时匹配
 * - array: OR 语义 — 任一元素匹配即 true
 * - record: AND 语义 — 每个 key 递归匹配
 */
export function matchPermissionMatcher(matcher: PermissionMatcher, value: unknown): boolean {
  // undefined matcher
  if (matcher === undefined) {
    return value === undefined;
  }

  // null matcher
  if (matcher === null) {
    return value === null;
  }

  // boolean matcher
  if (typeof matcher === "boolean") {
    return value === matcher;
  }

  // number matcher
  if (typeof matcher === "number") {
    return value === matcher;
  }

  // string matcher: glob or regex
  if (typeof matcher === "string") {
    if (typeof value !== "string") return false;

    // 检查是否为 /regex/ 格式
    const regexMatch = matcher.match(/^\/(.+)\/([gimsuy]*)$/);
    if (regexMatch) {
      const regex = new RegExp(regexMatch[1], regexMatch[2]);
      return regex.test(value);
    }

    // 否则 glob 匹配
    return matchToolPattern(matcher, value);
  }

  // array matcher: OR
  if (Array.isArray(matcher)) {
    return matcher.some((m) => matchPermissionMatcher(m, value));
  }

  // record matcher: AND (each key must match)
  if (typeof matcher === "object") {
    if (typeof value !== "object" || value === null) return false;
    const record = value as Record<string, unknown>;
    return Object.entries(matcher).every(([key, subMatcher]) =>
      matchPermissionMatcher(subMatcher, record[key]),
    );
  }

  return false;
}

// ─── 权限条目匹配 ──────────────────────────────────────

/**
 * 检查 PermissionEntry 是否匹配给定的工具调用
 * 逆向: tool-permissions.js ~230-270
 *
 * 双重检查:
 * 1. entry.tool glob 模式匹配 toolName
 * 2. entry.matches (如果定义) 中每个 key 递归匹配 args 对应值
 */
export function matchPermissionEntry(
  entry: PermissionEntry,
  toolName: string,
  args: Record<string, unknown>,
): boolean {
  // 1. 工具名模式匹配
  if (!matchToolPattern(entry.tool, toolName)) {
    return false;
  }

  // 2. 参数匹配 (如果定义了 matches)
  if (entry.matches) {
    for (const [key, matcher] of Object.entries(entry.matches)) {
      if (!matchPermissionMatcher(matcher, args[key])) {
        return false;
      }
    }
  }

  return true;
}
