import { describe, test, expect } from 'bun:test';

function tmuxAvailable(): boolean {
  const res = Bun.spawnSync({
    cmd: ['tmux', '-V'],
    stdout: 'pipe',
    stderr: 'pipe',
  });
  return res.exitCode === 0;
}

function runTmux(cmd: string[]): { exitCode: number; stdout: string; stderr: string } {
  const res = Bun.spawnSync({
    cmd: ['tmux', ...cmd],
    stdout: 'pipe',
    stderr: 'pipe',
  });
  return {
    exitCode: res.exitCode,
    stdout: new TextDecoder().decode(res.stdout ?? new Uint8Array()),
    stderr: new TextDecoder().decode(res.stderr ?? new Uint8Array()),
  };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

describe('E2E (tmux): welcome scenario', () => {
  test(
    'renders the bottom hint in a real TTY',
    async () => {
      if (!tmuxAvailable()) {
        // bun:test skip pattern
        return;
      }

      const session = `flitter-e2e-${Date.now()}`;
      const cwd = '/Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-amp';

      // Start the real TUI as the tmux pane process.
      const start = runTmux([
        'new-session',
        '-d',
        '-s',
        session,
        '-c',
        cwd,
        'env',
        'TERM=xterm-256color',
        'bun',
        'run',
        'src/test-utils/tmux-harness.ts',
        '--scenario',
        'welcome',
      ]);
      expect(start.exitCode).toBe(0);

      try {
        // Give the app a moment to draw.
        await sleep(800);

        // Capture current pane contents.
        const cap = runTmux(['capture-pane', '-p', '-t', session]);
        expect(cap.exitCode, cap.stderr || cap.stdout).toBe(0);

        // The exact welcome body can evolve; assert stable affordance text.
        expect(cap.stdout).toContain('? for shortcuts');
      } finally {
        runTmux(['kill-session', '-t', session]);
      }
    },
    { timeout: 20_000 },
  );
});
