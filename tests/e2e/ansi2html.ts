#!/usr/bin/env bun
/**
 * ANSI SGR → HTML converter for visual regression testing.
 *
 * Thin wrapper around `ansi_up` (https://github.com/drudru/ansi_up) that reads
 * `tmux capture-pane -e -p` output from stdin and writes a styled HTML document.
 *
 * CLI usage:
 *   tmux capture-pane -t sess -e -p | bun run tests/e2e/ansi2html.ts > out.html
 *   tmux capture-pane -t sess -e -p | bun run tests/e2e/ansi2html.ts --title "StatusBar" > out.html
 *
 * Programmatic usage:
 *   import { convertAnsiToHtml } from "./ansi2html.ts";
 *   const html = convertAnsiToHtml(ansiText, { title: "My Capture" });
 *
 * @module
 */

import { AnsiUp } from "ansi_up";

export interface ConvertOptions {
  /** HTML <title> text. Default: "Terminal Capture" */
  title?: string;
  /** Body background color. Default: "#1a1b26" (Tokyo Night) */
  bg?: string;
  /** Body text color. Default: "#a9b1d6" */
  fg?: string;
}

/**
 * Convert ANSI-escaped terminal text to a complete HTML document.
 *
 * @param input - Raw text with ANSI SGR escape sequences (from `capture-pane -e -p`)
 * @param options - Title, background color, text color overrides
 * @returns Complete HTML document string
 */
export function convertAnsiToHtml(input: string, options: ConvertOptions = {}): string {
  const title = options.title ?? "Terminal Capture";
  const bg = options.bg ?? "#1a1b26";
  const fg = options.fg ?? "#a9b1d6";

  const au = new AnsiUp();
  au.use_classes = false;
  const body = au.ansi_to_html(input);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title.replace(/</g, "&lt;")}</title>
<style>
body {
  background: ${bg};
  color: ${fg};
  font-family: "JetBrains Mono", "Fira Code", "SF Mono", Menlo, monospace;
  font-size: 13px;
  line-height: 1.4;
  padding: 16px;
  white-space: pre;
}
</style>
</head>
<body>${body}</body>
</html>`;
}

// ── CLI entry point ──

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  let title = "Terminal Capture";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--title" && args[i + 1]) {
      title = args[i + 1];
      i++;
    }
  }

  const input = await Bun.stdin.text();
  process.stdout.write(convertAnsiToHtml(input, { title }));
}
