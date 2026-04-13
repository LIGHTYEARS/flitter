/**
 * @flitter/data — JSONC Stripper
 *
 * 去除 JSON with Comments 中的 // 行注释和 /* * / 块注释
 * 状态机实现，正确处理字符串字面量中的假注释
 * 自实现 (KD-27)，不引入外部依赖
 *
 * @example
 * ```ts
 * const json = stripJsonComments('{ "url": "http://example.com" } // comment');
 * JSON.parse(json); // { "url": "http://example.com" }
 * ```
 */

/** 从 JSONC 字符串中去除注释，返回纯 JSON */
export function stripJsonComments(input: string): string {
  let result = "";
  let i = 0;
  const len = input.length;

  while (i < len) {
    const ch = input[i];
    const next = i + 1 < len ? input[i + 1] : "";

    // 字符串字面量 — 原样保留
    if (ch === '"') {
      let j = i + 1;
      while (j < len) {
        if (input[j] === "\\") {
          j += 2; // 跳过转义字符
          continue;
        }
        if (input[j] === '"') {
          j++;
          break;
        }
        j++;
      }
      result += input.slice(i, j);
      i = j;
      continue;
    }

    // 行注释 //
    if (ch === "/" && next === "/") {
      // 跳到行尾
      let j = i + 2;
      while (j < len && input[j] !== "\n") j++;
      i = j;
      continue;
    }

    // 块注释 /* */
    if (ch === "/" && next === "*") {
      let j = i + 2;
      while (j < len - 1) {
        if (input[j] === "*" && input[j + 1] === "/") {
          j += 2;
          break;
        }
        j++;
      }
      if (j >= len - 1 && !(input[j - 1] === "/" && input[j - 2] === "*")) {
        j = len; // Unterminated block comment
      }
      // 保留换行符以维持行号
      const skipped = input.slice(i, j);
      result += skipped.replace(/[^\n]/g, "");
      i = j;
      continue;
    }

    result += ch;
    i++;
  }

  return result;
}
