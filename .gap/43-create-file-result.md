# Gap T05: CreateFileTool Ignores Result Entirely

## Problem

`CreateFileTool` in `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/create-file-tool.ts`
never reads `this.toolCall.result`. Its expanded view only renders the `content` field extracted
from `rawInput` -- the file body the agent *asked* to write. The actual outcome of the
operation (success confirmation, error message, bytes written, resulting path after
normalisation, etc.) is silently discarded.

Every other specialised renderer in the `tool-call/` directory consumes the result:

| Widget | How it uses the result |
|---|---|
| `BashTool` | `extractOutput()` reads `result.rawOutput` (stdout/stderr) and `extractExitCode()` reads `result.rawOutput.exit_code` |
| `EditFileTool` | `extractDiff()` reads `result.rawOutput` and `result.content` for a unified diff; `extractSummary()` falls back to stringified output |
| `ReadTool` | `extractOutput()` reads `result.rawOutput` / `result.content` for the file text |
| `GenericToolCard` | `extractOutputText()` reads `result.rawOutput` / `result.content` as a general fallback |

`CreateFileTool` does none of this.

### User-visible consequences

1. **No success/failure feedback** -- When the tool status transitions to `completed` or
   `failed`, the header icon changes, but no explanatory text (e.g. "File created
   successfully" or "Permission denied: /etc/hosts") is shown in the expanded body.
2. **Error details lost** -- If the file system rejects the write (disk full, read-only
   mount, path too long) the error message inside `result.content` or `result.rawOutput`
   is never displayed.
3. **Metadata invisible** -- Some ACP providers return metadata in `rawOutput` such as
   `bytes_written`, `resolved_path`, or `overwritten: true`. These are discarded.

## Proposed Solution

Add result rendering that mirrors the established pattern used by `BashTool` and
`EditFileTool`: extract text from `result.rawOutput` and `result.content`, render it
below the content preview, and surface errors with the destructive colour.

### Extraction helpers

Add two private methods to `CreateFileTool`:

```typescript
/**
 * Extracts a human-readable result string from the tool call result.
 * Checks rawOutput first (which may contain structured metadata), then
 * falls back to iterating result.content text blocks.
 */
private extractResultText(): string {
  if (!this.toolCall.result) return '';

  // rawOutput may be a string or an object with fields like
  // { success: true, bytes_written: 1234, resolved_path: "..." }
  if (this.toolCall.result.rawOutput) {
    const raw = this.toolCall.result.rawOutput;
    if (typeof raw === 'string') return raw;
    return JSON.stringify(raw, null, 2);
  }

  // Fall back to content array (standard ACP text blocks)
  return this.toolCall.result.content
    ?.map(c =>
      (c as Record<string, unknown>)['text'] as string
        ?? c.content?.text
        ?? ''
    )
    .join('\n') ?? '';
}

/**
 * Returns true when the tool result indicates a failure.
 * This drives colour selection -- failures use the destructive palette.
 */
private isResultError(): boolean {
  if (this.toolCall.status === 'failed') return true;
  if (this.toolCall.result?.status === 'failed') return true;
  return false;
}
```

### Updated `build()` method

The full replacement for the `build` method. Changes are marked with `// NEW`
comments.  The key change is that after the optional content preview, we append
a result section when `this.toolCall.result` is present.

```typescript
build(context: BuildContext): Widget {
  const theme = AmpThemeProvider.maybeOf(context);
  const input = this.toolCall.rawInput ?? {};
  const filePath = (
    input['file_path']
    ?? input['path']
    ?? input['filename']
    ?? input['file']
    ?? input['destination']
    ?? ''
  ) as string;

  const header = new ToolHeader({
    name: this.toolCall.kind ?? 'CreateFile',
    status: this.toolCall.status,
    details: filePath ? [filePath] : [],
  });

  if (!this.isExpanded) {
    return header;
  }

  const bodyChildren: Widget[] = [];

  // --- Input content preview (existing behaviour, unchanged) ----------
  const content = (input['content'] ?? '') as string;
  if (content) {
    const preview =
      content.length > 500
        ? content.slice(0, 500) + '\n...(truncated)'
        : content;

    bodyChildren.push(
      new Padding({
        padding: EdgeInsets.only({ left: 2, right: 2 }),
        child: new Text({
          text: new TextSpan({
            text: preview,
            style: new TextStyle({
              foreground: theme?.base.mutedForeground ?? Color.brightBlack,
              dim: true,
            }),
          }),
        }),
      }),
    );
  }

  // --- NEW: Result / output section -----------------------------------
  const resultText = this.extractResultText();
  if (resultText) {
    const isError = this.isResultError();
    const resultColor = isError
      ? (theme?.base.destructive ?? Color.red)
      : (theme?.app.toolSuccess ?? Color.green);

    const truncatedResult =
      resultText.length > 1000
        ? resultText.slice(0, 1000) + '\n...(truncated)'
        : resultText;

    bodyChildren.push(
      new Padding({
        padding: EdgeInsets.only({ left: 2, right: 2 }),
        child: new Text({
          text: new TextSpan({
            text: truncatedResult,
            style: new TextStyle({
              foreground: resultColor,
              dim: !isError,   // errors are not dimmed for visibility
            }),
          }),
        }),
      }),
    );
  }
  // --- END NEW --------------------------------------------------------

  if (bodyChildren.length === 0) {
    return header;
  }

  return new Column({
    mainAxisSize: 'min',
    crossAxisAlignment: 'stretch',
    children: [header, ...bodyChildren],
  });
}
```

### Complete file after the change

For clarity, the full file with all modifications applied:

```typescript
// CreateFileTool -- file creation card showing the file path
// Amp ref: create_file tool -- shows the created file path and creation result

import { StatelessWidget, Widget, BuildContext } from 'flitter-core/src/framework/widget';
import { Column } from 'flitter-core/src/widgets/flex';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { Padding } from 'flitter-core/src/widgets/padding';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import { ToolHeader } from './tool-header';
import { AmpThemeProvider } from '../../themes/index';
import type { ToolCallItem } from '../../acp/types';

interface CreateFileToolProps {
  toolCall: ToolCallItem;
  isExpanded: boolean;
}

/**
 * Renders a create_file tool call showing the file path being created.
 * When expanded, shows file content preview and/or the creation result.
 */
export class CreateFileTool extends StatelessWidget {
  private readonly toolCall: ToolCallItem;
  private readonly isExpanded: boolean;

  constructor(props: CreateFileToolProps) {
    super({});
    this.toolCall = props.toolCall;
    this.isExpanded = props.isExpanded;
  }

  build(context: BuildContext): Widget {
    const theme = AmpThemeProvider.maybeOf(context);
    const input = this.toolCall.rawInput ?? {};
    const filePath = (
      input['file_path']
      ?? input['path']
      ?? input['filename']
      ?? input['file']
      ?? input['destination']
      ?? ''
    ) as string;

    const header = new ToolHeader({
      name: this.toolCall.kind ?? 'CreateFile',
      status: this.toolCall.status,
      details: filePath ? [filePath] : [],
    });

    if (!this.isExpanded) {
      return header;
    }

    const bodyChildren: Widget[] = [];

    // --- Input content preview ----------------------------------------
    const content = (input['content'] ?? '') as string;
    if (content) {
      const preview =
        content.length > 500
          ? content.slice(0, 500) + '\n...(truncated)'
          : content;

      bodyChildren.push(
        new Padding({
          padding: EdgeInsets.only({ left: 2, right: 2 }),
          child: new Text({
            text: new TextSpan({
              text: preview,
              style: new TextStyle({
                foreground: theme?.base.mutedForeground ?? Color.brightBlack,
                dim: true,
              }),
            }),
          }),
        }),
      );
    }

    // --- Result / output section --------------------------------------
    const resultText = this.extractResultText();
    if (resultText) {
      const isError = this.isResultError();
      const resultColor = isError
        ? (theme?.base.destructive ?? Color.red)
        : (theme?.app.toolSuccess ?? Color.green);

      const truncatedResult =
        resultText.length > 1000
          ? resultText.slice(0, 1000) + '\n...(truncated)'
          : resultText;

      bodyChildren.push(
        new Padding({
          padding: EdgeInsets.only({ left: 2, right: 2 }),
          child: new Text({
            text: new TextSpan({
              text: truncatedResult,
              style: new TextStyle({
                foreground: resultColor,
                dim: !isError,
              }),
            }),
          }),
        }),
      );
    }

    if (bodyChildren.length === 0) {
      return header;
    }

    return new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'stretch',
      children: [header, ...bodyChildren],
    });
  }

  // -------------------------------------------------------------------
  // Result extraction helpers
  // -------------------------------------------------------------------

  /**
   * Extracts a human-readable result string from the tool call result.
   * Checks rawOutput first, then falls back to result.content text blocks.
   */
  private extractResultText(): string {
    if (!this.toolCall.result) return '';

    if (this.toolCall.result.rawOutput) {
      const raw = this.toolCall.result.rawOutput;
      if (typeof raw === 'string') return raw;
      return JSON.stringify(raw, null, 2);
    }

    return this.toolCall.result.content
      ?.map(c =>
        (c as Record<string, unknown>)['text'] as string
          ?? c.content?.text
          ?? ''
      )
      .join('\n') ?? '';
  }

  /**
   * Returns true when the tool result indicates a failure.
   */
  private isResultError(): boolean {
    if (this.toolCall.status === 'failed') return true;
    if (this.toolCall.result?.status === 'failed') return true;
    return false;
  }
}
```

## Design Decisions

### Why colour the result by status?

`BashTool` already uses green for `exit_code === 0` and red for non-zero.
Applying the same convention (success colour for a clean write, destructive
colour for errors) keeps the visual language consistent across the tool-call
renderers. Errors are rendered without `dim: true` so they stand out; success
messages stay dimmed to avoid visual noise.

### Why keep the content preview?

The input content preview is still useful during the `in_progress` phase -- it
shows the user what is about to be written before the result arrives. Once the
result is available, both sections render: the preview above and the result
below, separated naturally by padding.

### Why truncate at 1000 characters for results?

`ReadTool` truncates at 1000, `BashTool` at 2000. File creation results are
typically short (a confirmation sentence or a brief error), so 1000 characters
is generous while still capping pathological cases. The content preview remains
at its existing 500-character limit since it is showing the (potentially large)
file body.

### Why not use `Markdown` for the result?

`GenericToolCard` renders output via the `Markdown` widget. For specialised
tool cards, the convention (see `BashTool`, `ReadTool`, `EditFileTool`) is to
use plain `Text` with `TextSpan` styling. This keeps the output compact and
avoids parsing overhead for what is usually a single-line confirmation or a
short error message.

## Testing Considerations

1. **Unit test: result absent** -- When `toolCall.result` is `undefined`
   (tool still in progress), the expanded view should show only the content
   preview, no result section. This is the existing behaviour and must not
   regress.

2. **Unit test: result with rawOutput object** -- Provide a `rawOutput` like
   `{ success: true, bytes_written: 42 }`. The result section should render
   the JSON-stringified representation in the success colour.

3. **Unit test: result with content array** -- Provide `result.content` with
   text blocks. The result section should concatenate and display them.

4. **Unit test: failed status** -- Set `toolCall.status` to `'failed'` and
   provide an error message in `result.content`. The result text should render
   in the destructive colour without dimming.

5. **Unit test: no input content, only result** -- When `rawInput.content` is
   empty but a result exists, the body should contain only the result section
   (no empty content preview).

6. **Snapshot/visual test** -- Verify that a completed CreateFile card with
   both a content preview and a success result renders two distinct text
   blocks with appropriate colours and padding.
