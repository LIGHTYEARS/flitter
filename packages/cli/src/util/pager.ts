/**
 * Open text content in the system pager ($PAGER or "less").
 * 逆向: amp-cli-reversed/modules/2441_unknown_yd0.js — yd0(T)
 *
 * Suspends the TUI, spawns the pager process, then resumes on exit.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WidgetsBinding } from "@flitter/tui";

export function openInPager(text: string): void {
  const pager = process.env.PAGER || "less";
  const tmpDir = mkdtempSync(join(tmpdir(), "flitter-pager-"));
  const tmpFile = join(tmpDir, "output.txt");
  try {
    WidgetsBinding.instance.tui.handleSuspend();
    writeFileSync(tmpFile, text, "utf-8");
    const [cmd = pager, ...args] = pager.split(" ");
    spawnSync(cmd, [...args, tmpFile], {
      stdio: "inherit",
      env: { ...process.env, LESS: "-X -c" },
    });
  } finally {
    // 逆向: clear screen + hide cursor before resuming
    process.stdout.write("\x1b[2J\x1b[H\x1b[?25l");
    WidgetsBinding.instance.tui.handleResume();
    try {
      unlinkSync(tmpFile);
      rmdirSync(tmpDir);
    } catch {
      // cleanup is best-effort
    }
  }
}
