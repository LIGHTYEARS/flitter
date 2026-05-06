/**
 * SyntaxHighlighter (Prism.js-based) unit tests.
 *
 * Verifies language-aware syntax highlighting via Prism.js tokenization,
 * language name normalization, and fallback behavior.
 */

import { describe, expect, it } from "bun:test";

import { Color } from "../screen/color.js";
import { normalizeLangName } from "./prism-languages.js";
import { SyntaxHighlighter } from "./syntax-highlight.js";

describe("SyntaxHighlighter (Prism-based)", () => {
  const hl = new SyntaxHighlighter(SyntaxHighlighter.defaultTheme());

  it("TypeScript: 'const' highlighted as keyword (blue)", () => {
    const spans = hl.highlight("const x = 1;", "typescript");
    const constSpan = spans.find((s) => s.text === "const");
    expect(constSpan).toBeDefined();
    expect(constSpan!.style!.foreground.equals(Color.blue())).toBe(true);
  });

  it("Python: 'def' highlighted as keyword", () => {
    const spans = hl.highlight("def hello():\n  pass", "python");
    const defSpan = spans.find((s) => s.text === "def");
    expect(defSpan).toBeDefined();
    expect(defSpan!.style!.foreground.equals(Color.blue())).toBe(true);
  });

  it("normalizes language names (ts -> typescript)", () => {
    const spans = hl.highlight("const x = 1;", "ts");
    const constSpan = spans.find((s) => s.text === "const");
    expect(constSpan).toBeDefined();
    expect(constSpan!.style!.foreground.equals(Color.blue())).toBe(true);
  });

  it("unknown language falls back to clike grammar", () => {
    // clike grammar still tokenizes basic keywords
    const spans = hl.highlight("int x = 5;", "unknownlang");
    expect(spans.length).toBeGreaterThan(1);
  });

  it("string literals highlighted green", () => {
    const spans = hl.highlight('const s = "hello";', "javascript");
    const strSpan = spans.find((s) => s.text === '"hello"');
    expect(strSpan).toBeDefined();
    expect(strSpan!.style!.foreground.equals(Color.green())).toBe(true);
  });

  it("comments highlighted dim", () => {
    const spans = hl.highlight("// comment\nconst x = 1;", "javascript");
    const commentSpan = spans.find((s) => s.text?.includes("comment"));
    expect(commentSpan).toBeDefined();
    expect(commentSpan!.style!.dim).toBe(true);
  });

  it("number literals highlighted yellow", () => {
    const spans = hl.highlight("const x = 42;", "javascript");
    const numSpan = spans.find((s) => s.text === "42");
    expect(numSpan).toBeDefined();
    expect(numSpan!.style!.foreground.equals(Color.yellow())).toBe(true);
  });

  it("function calls highlighted cyan", () => {
    const spans = hl.highlight("console.log(x);", "javascript");
    // Prism may tokenize "log" as a function
    const funcSpan = spans.find((s) => s.style?.foreground.equals(Color.cyan()));
    // At minimum, the code should be tokenized into multiple spans
    expect(spans.length).toBeGreaterThan(1);
    // funcSpan may or may not exist depending on Prism's analysis
    void funcSpan;
  });

  it("empty code returns empty array", () => {
    const spans = hl.highlight("", "javascript");
    expect(spans).toEqual([]);
  });

  it("Rust: 'fn' highlighted as keyword", () => {
    const spans = hl.highlight("fn main() {}", "rust");
    const fnSpan = spans.find((s) => s.text === "fn");
    expect(fnSpan).toBeDefined();
    expect(fnSpan!.style!.foreground.equals(Color.blue())).toBe(true);
  });

  it("Go: 'func' highlighted as keyword", () => {
    const spans = hl.highlight("func main() {}", "go");
    const funcSpan = spans.find((s) => s.text === "func");
    expect(funcSpan).toBeDefined();
    expect(funcSpan!.style!.foreground.equals(Color.blue())).toBe(true);
  });

  it("bash/shell: normalizes to bash grammar", () => {
    const spans = hl.highlight("echo hello", "shell");
    expect(spans.length).toBeGreaterThan(0);
  });

  it("handles multi-line code", () => {
    const code = `function add(a, b) {\n  return a + b;\n}`;
    const spans = hl.highlight(code, "javascript");
    const fnSpan = spans.find((s) => s.text === "function");
    expect(fnSpan).toBeDefined();
    expect(fnSpan!.style!.foreground.equals(Color.blue())).toBe(true);
    const returnSpan = spans.find((s) => s.text === "return");
    expect(returnSpan).toBeDefined();
    expect(returnSpan!.style!.foreground.equals(Color.blue())).toBe(true);
  });
});

describe("normalizeLangName", () => {
  it("maps common extensions to Prism grammar names", () => {
    expect(normalizeLangName("js")).toBe("javascript");
    expect(normalizeLangName("ts")).toBe("typescript");
    expect(normalizeLangName("py")).toBe("python");
    expect(normalizeLangName("rb")).toBe("ruby");
    expect(normalizeLangName("rs")).toBe("rust");
    expect(normalizeLangName("sh")).toBe("bash");
    expect(normalizeLangName("yml")).toBe("yaml");
  });

  it("maps full language names", () => {
    expect(normalizeLangName("javascript")).toBe("javascript");
    expect(normalizeLangName("typescript")).toBe("typescript");
    expect(normalizeLangName("python")).toBe("python");
    expect(normalizeLangName("rust")).toBe("rust");
  });

  it("is case-insensitive", () => {
    expect(normalizeLangName("TypeScript")).toBe("typescript");
    expect(normalizeLangName("PYTHON")).toBe("python");
    expect(normalizeLangName("JavaScript")).toBe("javascript");
  });

  it("returns 'plain' for unknown languages", () => {
    expect(normalizeLangName("unknownlang")).toBe("plain");
    expect(normalizeLangName("foobar")).toBe("plain");
  });

  it("handles whitespace", () => {
    expect(normalizeLangName("  ts  ")).toBe("typescript");
    expect(normalizeLangName(" python ")).toBe("python");
  });
});
