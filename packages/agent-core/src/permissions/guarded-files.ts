/**
 * Guarded Files — 受保护文件检查
 *
 * 从工具参数中提取文件路径, 检查是否受保护
 * 逆向: tool-permissions.js 的 jmR (getToolFilePaths), rcT (checkGuardedFile)
 */
import * as path from "node:path";
import { matchToolPattern } from "./matcher";

// ─── 工具文件路径提取 ──────────────────────────────────

/**
 * 从工具参数中提取该工具将访问的文件路径
 * 逆向: jmR (getToolFilePaths)
 *
 * 提取策略:
 * - Read/Write/Edit: args.file_path (单个绝对路径)
 * - Grep/Glob/FuzzyFind: args.path (搜索目录)
 * - Bash: 从 args.command 中解析简单文件路径 (以 / 开头的 token)
 * - 其他工具: 返回空数组
 */
export function getToolFilePaths(
  toolName: string,
  args: Record<string, unknown>,
): string[] {
  const paths: string[] = [];

  switch (toolName) {
    case "Read":
    case "Write":
    case "Edit": {
      const filePath = args.file_path as string | undefined;
      if (filePath && path.isAbsolute(filePath)) {
        paths.push(filePath);
      }
      break;
    }
    case "Grep":
    case "Glob":
    case "FuzzyFind": {
      const searchPath = args.path as string | undefined;
      if (searchPath && path.isAbsolute(searchPath)) {
        paths.push(searchPath);
      }
      break;
    }
    case "Bash": {
      const command = args.command as string | undefined;
      if (command) {
        // 基础解析: 提取以 / 开头、不含引号/空白的路径 token
        const pathRegex = /(?:^|\s)(\/[^\s'"`;|&><]+)/g;
        let match: RegExpExecArray | null;
        while ((match = pathRegex.exec(command)) !== null) {
          paths.push(match[1]);
        }
      }
      break;
    }
  }

  return paths;
}

// ─── 受保护文件检查 ────────────────────────────────────

/**
 * 检查文件是否受保护 (即不在 allowlist 中)
 * 逆向: rcT (checkGuardedFile)
 *
 * 逻辑:
 * - 如果 filePath 匹配 allowlist 中任一 glob 模式 → 不受保护 (返回 false)
 * - 否则 → 受保护 (返回 true)
 */
export function checkGuardedFile(
  filePath: string,
  allowlist: string[],
): boolean {
  // allowlist 为空 → 所有文件受保护
  if (allowlist.length === 0) return true;

  // 任一模式匹配 → 不受保护
  return !allowlist.some((pattern) => matchToolPattern(pattern, filePath));
}
