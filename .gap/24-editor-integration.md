# Gap U02: Ctrl+G $EDITOR Integration -- TUI Suspend/Resume

## Problem Statement

The `Ctrl+G` keyboard shortcut in `app.ts` (line 191-193) is intended to open the
user's `$EDITOR` (or `$VISUAL`) so they can compose or edit their prompt in a
full-featured text editor. The current handler is a stub that returns `'handled'`
but does nothing:

```typescript
// Ctrl+G -- open prompt in $EDITOR
// TODO: Full TUI suspend requires WidgetsBinding.suspend()/resume()
// When available: suspend TUI, spawn editor, resume with edited text
if (event.ctrlKey && event.key === 'g') {
  return 'handled';
}
```

This is a broken affordance: the shortcut is consumed (preventing any other handler
from processing it) but produces no visible result. The user expects to be dropped
into their preferred editor with the current input text pre-populated, then have
the edited text loaded back into the input area upon editor exit.

## Affected Files

| File | Role |
|------|------|
| `/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts` | Ctrl+G handler stub (lines 188-193); owns `AppStateWidget` with access to the widget tree |
| `/home/gem/workspace/flitter/packages/flitter-core/src/framework/binding.ts` | `WidgetsBinding` singleton; owns `TerminalManager` via `this._tui`; controls frame scheduling; needs `suspend()`/`resume()` methods |
| `/home/gem/workspace/flitter/packages/flitter-core/src/terminal/terminal-manager.ts` | Already implements `suspend()` and `resume()` (lines 281-313); manages raw mode, alt screen, mouse, bracketed paste |
| `/home/gem/workspace/flitter/packages/flitter-core/src/terminal/platform.ts` | `BunPlatform` adapter; `enableRawMode()`/`disableRawMode()` toggle stdin raw mode |
| `/home/gem/workspace/flitter/packages/flitter-core/src/scheduler/frame-scheduler.ts` | `FrameScheduler`; must not fire frames while the TUI is suspended |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/input-area.ts` | `InputArea` / `InputAreaState`; owns the `TextEditingController` (line 65); the edited text must be injected back via this controller |

## What Already Exists

The **TerminalManager** layer is essentially complete. `suspend()` and `resume()`
are already implemented and tested:

- **`TerminalManager.suspend()`** (line 281): Disables SGR mouse, disables
  bracketed paste, shows cursor, exits alt screen, then disables raw mode. Sets
  `_suspended = true`.
- **`TerminalManager.resume()`** (line 299): Enables raw mode, enters alt screen,
  hides cursor, enables mouse, enables bracketed paste, calls
  `screenBuffer.markForRefresh()`. Sets `_suspended = false`.
- **Guard in `flush()`** (line 188): When `_suspended` is true, `flush()` returns
  immediately, preventing any ANSI output while the editor is running.
- **Tests** in `terminal-manager.test.ts` cover suspend/resume lifecycle,
  raw mode toggling, escape sequence emission, and no-op guards.

What is **missing** is the wiring from `WidgetsBinding` down to the Ctrl+G handler
and the child process lifecycle that spawns the editor.

## Proposed Architecture

The implementation spans three layers:

```
Layer 1: WidgetsBinding.suspend() / resume()    -- binding.ts
Layer 2: EditorLauncher utility                  -- new file in flitter-amp
Layer 3: Ctrl+G handler wiring                   -- app.ts
```

### Layer 1: WidgetsBinding Suspend/Resume

`WidgetsBinding` must expose `suspend()` and `resume()` as public async-safe
methods. These coordinate the TerminalManager, FrameScheduler, and InputParser.

#### New Methods on WidgetsBinding (binding.ts)

```typescript
/**
 * Suspend the TUI: pause frame scheduling, tear down terminal modes,
 * and detach input parsing. Used before spawning an external process
 * that needs direct terminal access (e.g., $EDITOR).
 *
 * Amp ref: J3 suspend pattern -- suspends tui, pauses scheduler
 */
suspend(): void {
  if (!this._isRunning || this._tui.isSuspended) return;

  // 1. Pause the frame scheduler to prevent any frames from firing
  //    while the terminal is handed off to the child process.
  this.frameScheduler.pause();

  // 2. Suspend the terminal: exit alt screen, disable raw mode, etc.
  //    TerminalManager.suspend() handles the escape sequence teardown.
  this._tui.suspend();

  // 3. Detach the input parser so stdin bytes go to the child process,
  //    not to our InputParser -> EventDispatcher pipeline.
  if (this._inputParser) {
    this._inputParser.pause();
  }
}

/**
 * Resume the TUI after an external process exits. Re-enters alt screen,
 * enables raw mode, reattaches input, resumes frame scheduling, and
 * forces a full repaint.
 *
 * Amp ref: J3 resume pattern -- resumes tui, restarts scheduler
 */
resume(): void {
  if (!this._isRunning || !this._tui.isSuspended) return;

  // 1. Resume the terminal: raw mode, alt screen, mouse, etc.
  this._tui.resume();

  // 2. Reattach input parsing.
  if (this._inputParser) {
    this._inputParser.resume();
  }

  // 3. Force a complete repaint since the screen was clobbered by the editor.
  this.requestForcedPaintFrame();

  // 4. Resume the frame scheduler so frames start flowing again.
  this.frameScheduler.resume();
}
```

#### FrameScheduler Pause/Resume

The `FrameScheduler` currently has no concept of pausing. A minimal addition
is needed:

```typescript
// In frame-scheduler.ts

private _paused: boolean = false;

/**
 * Pause frame scheduling. Any requestFrame() calls while paused
 * are recorded but not acted upon until resume().
 */
pause(): void {
  this._paused = true;
  // Cancel any pending timer/requestAnimationFrame
  if (this._pendingTimer !== null) {
    clearTimeout(this._pendingTimer);
    this._pendingTimer = null;
  }
}

/**
 * Resume frame scheduling. If frames were requested while paused,
 * schedule one immediately.
 */
resume(): void {
  const wasPaused = this._paused;
  this._paused = false;
  if (wasPaused && this._frameRequested) {
    this._scheduleFrame();
  }
}

// Modify requestFrame() to check _paused:
requestFrame(): void {
  if (this._frameRequested) return;
  this._frameRequested = true;
  if (this._paused) return;  // <-- new guard
  this._scheduleFrame();
}
```

#### InputParser Pause/Resume

The `InputParser` needs to stop processing stdin bytes while the editor runs.
Two options:

**Option A (preferred):** Add `pause()`/`resume()` to InputParser that set a flag
causing `feed()` to silently discard data:

```typescript
private _paused = false;

pause(): void { this._paused = true; }
resume(): void { this._paused = false; }

feed(data: Buffer): void {
  if (this._paused) return;
  // ... existing parse logic
}
```

**Option B:** Temporarily remove the stdin data handler from BunPlatform during
suspend. This is more invasive but guarantees no bytes leak. Since the
TerminalManager already manages handler registration, Option A is simpler and
sufficient -- the editor's child process inherits stdio directly (via
`{ stdio: 'inherit' }`) so stdin bytes flow to the editor, not to our handler.

### Layer 2: EditorLauncher Utility

A new module in flitter-amp that encapsulates the editor spawning logic.

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/utils/editor-launcher.ts`

```typescript
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { randomBytes } from 'crypto';

/**
 * Result of an editor session.
 */
export interface EditorResult {
  /** Whether the editor exited successfully (code 0). */
  success: boolean;
  /** The text content after editing, or null if cancelled/failed. */
  text: string | null;
}

/**
 * Resolve the editor command from environment.
 * Priority: $VISUAL > $EDITOR > platform fallback.
 *
 * Amp ref: editor resolution pattern -- checks VISUAL, EDITOR, falls
 * back to vi/nano.
 */
export function resolveEditor(): string {
  return (
    process.env.VISUAL ||
    process.env.EDITOR ||
    (process.platform === 'win32' ? 'notepad' : 'vi')
  );
}

/**
 * Write the initial text to a temp file, spawn the editor, wait for it
 * to exit, then read back the result.
 *
 * The caller is responsible for suspending/resuming the TUI around this call.
 *
 * @param initialText - Text to pre-populate in the editor
 * @returns EditorResult with the edited text or null on failure
 */
export async function launchEditor(initialText: string): Promise<EditorResult> {
  // 1. Create a temporary file with initial content
  const tmpFile = join(
    tmpdir(),
    `flitter-prompt-${randomBytes(4).toString('hex')}.md`,
  );

  try {
    writeFileSync(tmpFile, initialText, 'utf-8');
  } catch {
    return { success: false, text: null };
  }

  // 2. Resolve editor command
  const editor = resolveEditor();

  // 3. Parse editor command (handle "code --wait", "vim", etc.)
  const parts = editor.split(/\s+/);
  const cmd = parts[0]!;
  const args = [...parts.slice(1), tmpFile];

  // 4. Spawn the editor with inherited stdio
  try {
    const proc = Bun.spawn([cmd, ...args], {
      stdio: ['inherit', 'inherit', 'inherit'],
      env: process.env,
    });

    // Wait for the editor to exit
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      return { success: false, text: null };
    }

    // 5. Read back the edited content
    const editedText = readFileSync(tmpFile, 'utf-8');
    return { success: true, text: editedText };
  } catch {
    return { success: false, text: null };
  } finally {
    // 6. Clean up temp file
    try {
      if (existsSync(tmpFile)) {
        unlinkSync(tmpFile);
      }
    } catch {
      // Best-effort cleanup
    }
  }
}
```

### Layer 3: Ctrl+G Handler Wiring (app.ts)

The Ctrl+G handler in `AppStateWidget` must:

1. Get the current input text from the `TextEditingController`.
2. Suspend the TUI via `WidgetsBinding.instance.suspend()`.
3. Spawn the editor with the current text.
4. Resume the TUI via `WidgetsBinding.instance.resume()`.
5. Inject the edited text back into the `TextEditingController`.

#### Exposing the TextEditingController

Currently, the `TextEditingController` is private to `InputAreaState` (line 65 of
`input-area.ts`). The Ctrl+G handler in `AppStateWidget` does not have direct
access. Two approaches:

**Option A (callback prop):** Add an `onEditorRequest` callback to `InputArea` that
`InputAreaState` implements by reading from / writing to its controller. The
`AppStateWidget` passes a callback that handles the suspend/editor/resume cycle.

**Option B (controller lifting):** Lift the `TextEditingController` to
`AppStateWidget` and pass it down to `InputArea` as a prop. This is the more
common Flutter/Amp pattern and makes the controller accessible for both Ctrl+G
and Ctrl+R (prompt history -- another TODO).

Option B is recommended because it solves both Ctrl+G and Ctrl+R simultaneously.

#### Modified app.ts (Ctrl+G handler)

```typescript
// In AppStateWidget:

// Lifted controller (created in initState)
private inputController = new TextEditingController();

// ...

// Ctrl+G -- open prompt in $EDITOR
if (event.ctrlKey && event.key === 'g') {
  this._openInEditor();
  return 'handled';
}

// ...

private async _openInEditor(): Promise<void> {
  const binding = WidgetsBinding.instance;
  const currentText = this.inputController.text;

  // 1. Suspend the TUI
  binding.suspend();

  try {
    // 2. Launch editor with current input text
    const result = await launchEditor(currentText);

    // 3. If successful, replace the input text
    if (result.success && result.text !== null) {
      // Trim trailing newline that most editors add
      const editedText = result.text.replace(/\n+$/, '');
      this.inputController.text = editedText;
    }
  } finally {
    // 4. Always resume the TUI, even if editor fails
    binding.resume();

    // 5. Trigger a rebuild to reflect any text changes
    this.setState(() => {});
  }
}
```

#### Modified InputArea Props

```typescript
interface InputAreaProps {
  onSubmit: (text: string) => void;
  isProcessing: boolean;
  mode: string | null;
  controller?: TextEditingController;  // <-- new: external controller
  // ... existing props
}
```

When `controller` is provided, `InputAreaState` uses it instead of creating its
own. This follows the standard Flutter pattern for controlled text fields.

## Sequence Diagram

```
User presses Ctrl+G
  |
  v
AppStateWidget.onKey()
  |-- event.ctrlKey && event.key === 'g'
  |-- calls _openInEditor() (async, fire-and-forget from key handler)
  |
  v
_openInEditor()
  |
  |-- currentText = this.inputController.text
  |
  |-- WidgetsBinding.instance.suspend()
  |     |-- frameScheduler.pause()
  |     |-- terminalManager.suspend()
  |     |     |-- disable mouse, bracketed paste
  |     |     |-- show cursor
  |     |     |-- exit alt screen
  |     |     |-- disable raw mode
  |     |-- inputParser.pause()
  |
  |-- launchEditor(currentText)
  |     |-- write text to /tmp/flitter-prompt-XXXX.md
  |     |-- spawn $EDITOR with stdio: 'inherit'
  |     |     (editor has full terminal control)
  |     |-- await process exit
  |     |-- read edited text from temp file
  |     |-- delete temp file
  |     |-- return { success, text }
  |
  |-- WidgetsBinding.instance.resume()
  |     |-- terminalManager.resume()
  |     |     |-- enable raw mode
  |     |     |-- enter alt screen
  |     |     |-- hide cursor, enable mouse, bracketed paste
  |     |     |-- screenBuffer.markForRefresh()
  |     |-- inputParser.resume()
  |     |-- requestForcedPaintFrame()
  |     |-- frameScheduler.resume()
  |
  |-- if result.success:
  |     inputController.text = editedText
  |
  |-- setState(() => {})  // force rebuild
```

## Edge Cases and Error Handling

### No $EDITOR Set

If neither `$VISUAL` nor `$EDITOR` is set, the launcher falls back to `vi` on
Unix and `notepad` on Windows. This matches the behavior of `git commit` and
other CLI tools. If even the fallback editor is not found, `Bun.spawn` throws
and the `catch` block returns `{ success: false, text: null }`, causing the
handler to resume the TUI with no changes.

### Editor Exits Non-Zero

If the user quits the editor without saving (e.g., `:q!` in vim, or Ctrl+C),
the editor typically exits with a non-zero code. The launcher detects this and
returns `success: false`. The handler resumes the TUI with the original text
intact.

### Editor Command With Arguments

Some editors require flags: `code --wait`, `subl --wait`, `emacs -nw`. The
launcher splits the `$EDITOR` string on whitespace and treats the first token as
the command and the rest as arguments, appending the temp file path. This handles
the common cases correctly.

### Terminal State Corruption

If the editor crashes or is killed (SIGKILL), the terminal may be left in a
broken state. The `finally` block in `_openInEditor()` ensures `resume()` is
always called, which re-enters alt screen, enables raw mode, and forces a full
repaint. This is the same recovery pattern used by tools like `less`, `man`, and
`git log` when piped through a pager.

### Empty Editor Result

If the user saves an empty file, `result.text` will be an empty string. This is
a valid edit -- the input area should be cleared. No special handling is needed.

### Concurrent Key Events During Suspend

While the TUI is suspended, stdin goes directly to the editor process (via
`stdio: 'inherit'`). The `InputParser.pause()` call ensures that if any stray
bytes arrive at our stdin handler (unlikely with inherited stdio), they are
silently discarded rather than interpreted as TUI key events.

### Frame Scheduler Race

If `requestFrame()` is called between `suspend()` and the editor process
actually starting (e.g., by a pending timer or listener), the FrameScheduler
pause mechanism absorbs it. The frame is deferred until `resume()` is called.

## Testing Strategy

### Unit Tests

1. **WidgetsBinding.suspend()/resume()** -- Verify that:
   - `suspend()` calls `tui.suspend()`, pauses the frame scheduler, pauses the input parser.
   - `resume()` calls `tui.resume()`, resumes the frame scheduler, calls `requestForcedPaintFrame()`.
   - Calling `suspend()` while already suspended is a no-op.
   - Calling `resume()` while not suspended is a no-op.

2. **FrameScheduler.pause()/resume()** -- Verify that:
   - `requestFrame()` while paused sets `_frameRequested` but does not schedule.
   - `resume()` after a paused `requestFrame()` triggers a frame.
   - `resume()` with no pending request is a no-op.

3. **InputParser.pause()/resume()** -- Verify that:
   - `feed()` while paused discards data.
   - `feed()` after resume processes normally.

4. **EditorLauncher.resolveEditor()** -- Verify:
   - Returns `$VISUAL` if set.
   - Falls back to `$EDITOR` if `$VISUAL` is unset.
   - Falls back to `vi` if neither is set (on Unix).

5. **EditorLauncher.launchEditor()** -- Integration test:
   - Mock the spawn to simulate editor exit code 0 with modified content.
   - Mock the spawn to simulate exit code 1 (failure).
   - Verify temp file creation and cleanup.

### Widget Tests

6. **Ctrl+G key event** -- Using `WidgetTester`:
   - Simulate `Ctrl+G` key event.
   - Verify that `_openInEditor()` is called (mock it).
   - Verify that the event returns `'handled'`.

### Manual Testing Checklist

- [ ] Press Ctrl+G with empty input -- editor opens with empty file.
- [ ] Press Ctrl+G with text in input -- editor opens with that text.
- [ ] Save and quit editor -- text appears in input area.
- [ ] Quit editor without saving -- original text is preserved.
- [ ] Set `$EDITOR=code --wait` -- VS Code opens with temp file.
- [ ] Set `$EDITOR=vim` -- Vim opens in terminal.
- [ ] Unset both `$VISUAL` and `$EDITOR` -- `vi` is used as fallback.
- [ ] Kill editor with Ctrl+C -- TUI resumes cleanly.
- [ ] Verify no screen corruption after editor exits.
- [ ] Verify mouse and keyboard work normally after resume.
- [ ] Verify scrollback and chat view repaint correctly after resume.

## Implementation Order

1. **FrameScheduler.pause()/resume()** -- Small, self-contained, testable in isolation.
2. **InputParser.pause()/resume()** -- Trivial flag addition, test with mock feed data.
3. **WidgetsBinding.suspend()/resume()** -- Orchestrates the above two plus existing TerminalManager methods.
4. **EditorLauncher utility** -- Pure utility, no framework dependencies, testable with mocked spawn.
5. **Lift TextEditingController** -- Refactor InputArea to accept an external controller. This also unblocks the Ctrl+R prompt history gap.
6. **Wire Ctrl+G handler** -- Connect all the pieces in `app.ts`.

## Estimated Complexity

| Component | Lines of Code | Difficulty |
|-----------|--------------|------------|
| FrameScheduler pause/resume | ~20 | Low |
| InputParser pause/resume | ~10 | Low |
| WidgetsBinding suspend/resume | ~30 | Medium (orchestration) |
| EditorLauncher utility | ~80 | Medium (child process) |
| TextEditingController lifting | ~30 (refactor) | Low (mechanical) |
| Ctrl+G handler wiring | ~30 | Low |
| Tests | ~150 | Medium |
| **Total** | **~350** | **Medium** |

## Relationship to Other Gaps

- **Gap U01 (Shortcut Help Overlay, #23):** The help overlay should list Ctrl+G
  as "Open in $EDITOR" once this is implemented. Currently it would show a
  non-functional shortcut.
- **Ctrl+R Prompt History (app.ts line 196-203):** Lifting the
  `TextEditingController` to `AppStateWidget` (step 5 above) also enables the
  prompt history TODO, since the controller becomes accessible to the Ctrl+R handler.
