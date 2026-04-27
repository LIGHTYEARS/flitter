/**
 * 终端图形协议支持检测。
 *
 * 通过环境变量检测当前终端是否支持 Kitty Graphics Protocol。
 *
 * 逆向: amp chunk-005.js — env-var 检测终端类型
 *
 * @module
 */

/**
 * 检测当前终端是否支持 Kitty Graphics Protocol。
 *
 * 支持的终端:
 * - kitty
 * - WezTerm
 * - Ghostty
 *
 * @returns true 表示支持 Kitty 图形协议
 */
export function supportsKittyGraphics(): boolean {
  const termProgram = (process.env.TERM_PROGRAM ?? "").toLowerCase();
  const termName = (process.env.TERM ?? "").toLowerCase();
  return (
    termProgram === "kitty" ||
    termProgram === "wezterm" ||
    termProgram === "ghostty" ||
    termName.includes("kitty") ||
    termName.includes("xterm-kitty")
  );
}
