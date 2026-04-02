// Tests for RenderText mouse interaction and emoji width detection
// Phase 14, Plan 02: Text Interaction + Emoji Width Detection

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { TextStyle } from '../../core/text-style';
import { TextSpan, TextSpanHyperlink } from '../../core/text-span';
import { Offset } from '../../core/types';
import { BoxConstraints } from '../../core/box-constraints';
import { RenderText } from '../text';
import { MouseManager } from '../../input/mouse-manager';
import { SystemMouseCursors } from '../../input/mouse-cursors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRenderText(text: string | TextSpan, opts?: {
  textAlign?: 'left' | 'center' | 'right';
  maxLines?: number;
}): RenderText {
  const span = typeof text === 'string' ? new TextSpan({ text }) : text;
  return new RenderText({
    text: span,
    textAlign: opts?.textAlign,
    maxLines: opts?.maxLines,
  });
}

function layoutRT(rt: RenderText, maxWidth = 80, maxHeight = 24): void {
  rt.layout(new BoxConstraints({ maxWidth, maxHeight }));
}

// ---------------------------------------------------------------------------
// getHyperlinkAtPosition tests
// ---------------------------------------------------------------------------

describe('RenderText.getHyperlinkAtPosition', () => {
  it('returns null for plain text', () => {
    const rt = createRenderText('hello');
    layoutRT(rt);

    expect(rt.getHyperlinkAtPosition(0, 0)).toBeNull();
    expect(rt.getHyperlinkAtPosition(2, 0)).toBeNull();
    expect(rt.getHyperlinkAtPosition(4, 0)).toBeNull();
  });

  it('returns hyperlink for text with hyperlink', () => {
    const link: TextSpanHyperlink = { uri: 'https://example.com' };
    const span = new TextSpan({
      text: 'click me',
      hyperlink: link,
    });
    const rt = createRenderText(span);
    layoutRT(rt);

    const result = rt.getHyperlinkAtPosition(0, 0);
    expect(result).not.toBeNull();
    expect(result!.uri).toBe('https://example.com');
  });

  it('returns hyperlink with id', () => {
    const link: TextSpanHyperlink = { uri: 'https://example.com', id: 'link-1' };
    const span = new TextSpan({
      text: 'click',
      hyperlink: link,
    });
    const rt = createRenderText(span);
    layoutRT(rt);

    const result = rt.getHyperlinkAtPosition(2, 0);
    expect(result).not.toBeNull();
    expect(result!.uri).toBe('https://example.com');
    expect(result!.id).toBe('link-1');
  });

  it('returns null for positions outside text bounds', () => {
    const link: TextSpanHyperlink = { uri: 'https://example.com' };
    const span = new TextSpan({ text: 'hi', hyperlink: link });
    const rt = createRenderText(span);
    layoutRT(rt);

    // Past end of text
    expect(rt.getHyperlinkAtPosition(5, 0)).toBeNull();
    // Wrong row
    expect(rt.getHyperlinkAtPosition(0, 1)).toBeNull();
  });

  it('distinguishes hyperlinked and non-hyperlinked spans', () => {
    const link: TextSpanHyperlink = { uri: 'https://example.com' };
    const span = new TextSpan({
      children: [
        new TextSpan({ text: 'normal ' }),
        new TextSpan({ text: 'link', hyperlink: link }),
        new TextSpan({ text: ' end' }),
      ],
    });
    const rt = createRenderText(span);
    layoutRT(rt);

    // 'normal ' is indices 0-6, 'link' is indices 7-10, ' end' is indices 11-14
    expect(rt.getHyperlinkAtPosition(0, 0)).toBeNull(); // 'n' - no hyperlink
    expect(rt.getHyperlinkAtPosition(6, 0)).toBeNull(); // ' ' - no hyperlink

    const linkResult = rt.getHyperlinkAtPosition(7, 0); // 'l' - hyperlink
    expect(linkResult).not.toBeNull();
    expect(linkResult!.uri).toBe('https://example.com');

    expect(rt.getHyperlinkAtPosition(9, 0)).not.toBeNull(); // 'n' in 'link' - hyperlink
    expect(rt.getHyperlinkAtPosition(11, 0)).toBeNull(); // ' ' after link - no hyperlink
  });

  it('works with multi-line text', () => {
    const link: TextSpanHyperlink = { uri: 'https://example.com' };
    const span = new TextSpan({
      children: [
        new TextSpan({ text: 'line1\n' }),
        new TextSpan({ text: 'link', hyperlink: link }),
      ],
    });
    const rt = createRenderText(span);
    layoutRT(rt);

    // 'line1' on row 0, 'link' on row 1
    expect(rt.getHyperlinkAtPosition(0, 0)).toBeNull(); // row 0
    const linkResult = rt.getHyperlinkAtPosition(0, 1); // 'l' of 'link' on row 1
    expect(linkResult).not.toBeNull();
    expect(linkResult!.uri).toBe('https://example.com');
  });

  it('returns null for empty text', () => {
    const rt = createRenderText('');
    layoutRT(rt);

    expect(rt.getHyperlinkAtPosition(0, 0)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getOnClickAtPosition tests
// ---------------------------------------------------------------------------

describe('RenderText.getOnClickAtPosition', () => {
  it('returns null for plain text', () => {
    const rt = createRenderText('hello');
    layoutRT(rt);

    expect(rt.getOnClickAtPosition(0, 0)).toBeNull();
  });

  it('returns onClick handler for text with onClick', () => {
    const handler = () => {};
    const span = new TextSpan({
      text: 'click me',
      onClick: handler,
    });
    const rt = createRenderText(span);
    layoutRT(rt);

    const result = rt.getOnClickAtPosition(0, 0);
    expect(result).toBe(handler);
  });

  it('returns null for positions outside text bounds', () => {
    const handler = () => {};
    const span = new TextSpan({ text: 'hi', onClick: handler });
    const rt = createRenderText(span);
    layoutRT(rt);

    expect(rt.getOnClickAtPosition(5, 0)).toBeNull();
    expect(rt.getOnClickAtPosition(0, 1)).toBeNull();
  });

  it('distinguishes clickable and non-clickable spans', () => {
    const handler = () => {};
    const span = new TextSpan({
      children: [
        new TextSpan({ text: 'plain ' }),
        new TextSpan({ text: 'button', onClick: handler }),
      ],
    });
    const rt = createRenderText(span);
    layoutRT(rt);

    // 'plain ' = indices 0-5, 'button' = indices 6-11
    expect(rt.getOnClickAtPosition(0, 0)).toBeNull();
    expect(rt.getOnClickAtPosition(5, 0)).toBeNull();
    expect(rt.getOnClickAtPosition(6, 0)).toBe(handler);
    expect(rt.getOnClickAtPosition(10, 0)).toBe(handler);
  });

  it('returns null for empty text', () => {
    const rt = createRenderText('');
    layoutRT(rt);

    expect(rt.getOnClickAtPosition(0, 0)).toBeNull();
  });

  it('inherits onClick from parent span', () => {
    const handler = () => {};
    const span = new TextSpan({
      onClick: handler,
      children: [
        new TextSpan({ text: 'child1 ' }),
        new TextSpan({ text: 'child2' }),
      ],
    });
    const rt = createRenderText(span);
    layoutRT(rt);

    // All children inherit onClick from parent
    expect(rt.getOnClickAtPosition(0, 0)).toBe(handler);
    expect(rt.getOnClickAtPosition(7, 0)).toBe(handler); // 'c' of 'child2'
  });
});

// ---------------------------------------------------------------------------
// handleMouseEvent tests
// ---------------------------------------------------------------------------

describe('RenderText.handleMouseEvent', () => {
  beforeEach(() => {
    MouseManager.reset();
  });

  afterEach(() => {
    MouseManager.reset();
  });

  it('click invokes onClick handler', () => {
    let clicked = false;
    const handler = () => { clicked = true; };
    const span = new TextSpan({ text: 'click me', onClick: handler });
    const rt = createRenderText(span);
    layoutRT(rt);

    rt.handleMouseEvent({ type: 'click', x: 0, y: 0 });
    expect(clicked).toBe(true);
  });

  it('click does nothing for plain text', () => {
    const rt = createRenderText('hello');
    layoutRT(rt);

    // Should not throw
    rt.handleMouseEvent({ type: 'click', x: 0, y: 0 });
  });

  it('click on hyperlink without onClick does not throw', () => {
    const link: TextSpanHyperlink = { uri: 'https://example.com' };
    const span = new TextSpan({ text: 'link', hyperlink: link });
    const rt = createRenderText(span);
    layoutRT(rt);

    // Should not throw
    rt.handleMouseEvent({ type: 'click', x: 0, y: 0 });
  });

  it('enter on hyperlink sets cursor to POINTER', () => {
    const link: TextSpanHyperlink = { uri: 'https://example.com' };
    const span = new TextSpan({ text: 'link', hyperlink: link });
    const rt = createRenderText(span);
    layoutRT(rt);

    rt.handleMouseEvent({ type: 'enter', x: 0, y: 0 });
    expect(MouseManager.instance.currentCursor).toBe(SystemMouseCursors.POINTER);
  });

  it('hover on onClick sets cursor to POINTER', () => {
    const handler = () => {};
    const span = new TextSpan({ text: 'btn', onClick: handler });
    const rt = createRenderText(span);
    layoutRT(rt);

    rt.handleMouseEvent({ type: 'hover', x: 0, y: 0 });
    expect(MouseManager.instance.currentCursor).toBe(SystemMouseCursors.POINTER);
  });

  it('enter on plain text does not set pointer cursor', () => {
    const rt = createRenderText('hello');
    layoutRT(rt);

    rt.handleMouseEvent({ type: 'enter', x: 0, y: 0 });
    expect(MouseManager.instance.currentCursor).toBe(SystemMouseCursors.DEFAULT);
  });

  it('exit resets cursor to DEFAULT', () => {
    const link: TextSpanHyperlink = { uri: 'https://example.com' };
    const span = new TextSpan({ text: 'link', hyperlink: link });
    const rt = createRenderText(span);
    layoutRT(rt);

    // First set pointer
    rt.handleMouseEvent({ type: 'enter', x: 0, y: 0 });
    expect(MouseManager.instance.currentCursor).toBe(SystemMouseCursors.POINTER);

    // Then exit
    rt.handleMouseEvent({ type: 'exit', x: 0, y: 0 });
    expect(MouseManager.instance.currentCursor).toBe(SystemMouseCursors.DEFAULT);
  });

  it('click invokes correct handler in mixed spans', () => {
    let result = '';
    const span = new TextSpan({
      children: [
        new TextSpan({ text: 'aaa', onClick: () => { result = 'first'; } }),
        new TextSpan({ text: 'bbb', onClick: () => { result = 'second'; } }),
      ],
    });
    const rt = createRenderText(span);
    layoutRT(rt);

    rt.handleMouseEvent({ type: 'click', x: 0, y: 0 }); // 'a' at index 0
    expect(result).toBe('first');

    rt.handleMouseEvent({ type: 'click', x: 3, y: 0 }); // 'b' at index 3
    expect(result).toBe('second');
  });

  it('click outside interactive area does not invoke handler', () => {
    let clicked = false;
    const handler = () => { clicked = true; };
    const span = new TextSpan({ text: 'hi', onClick: handler });
    const rt = createRenderText(span);
    layoutRT(rt);

    // Click at x=5 which is past the 2-char text
    rt.handleMouseEvent({ type: 'click', x: 5, y: 0 });
    expect(clicked).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// MouseManager.updateCursorOverride tests
// ---------------------------------------------------------------------------

describe('MouseManager.updateCursorOverride', () => {
  beforeEach(() => {
    MouseManager.reset();
  });

  afterEach(() => {
    MouseManager.reset();
  });

  it('override takes priority over region cursor', () => {
    MouseManager.instance.updateCursorOverride(SystemMouseCursors.POINTER);
    expect(MouseManager.instance.currentCursor).toBe(SystemMouseCursors.POINTER);
  });

  it('passing default clears override', () => {
    MouseManager.instance.updateCursorOverride(SystemMouseCursors.POINTER);
    expect(MouseManager.instance.currentCursor).toBe(SystemMouseCursors.POINTER);

    MouseManager.instance.updateCursorOverride(SystemMouseCursors.DEFAULT);
    expect(MouseManager.instance.currentCursor).toBe(SystemMouseCursors.DEFAULT);
  });

  it('override is cleared on reset', () => {
    MouseManager.instance.updateCursorOverride(SystemMouseCursors.POINTER);
    MouseManager.reset();
    expect(MouseManager.instance.currentCursor).toBe(SystemMouseCursors.DEFAULT);
  });
});

// ---------------------------------------------------------------------------
// Interaction cache rebuild tests
// ---------------------------------------------------------------------------

describe('RenderText interaction cache', () => {
  it('rebuilds interaction cache on re-layout', () => {
    const handler1 = () => {};
    const span1 = new TextSpan({ text: 'abc', onClick: handler1 });
    const rt = new RenderText({ text: span1 });
    layoutRT(rt);

    expect(rt.getOnClickAtPosition(0, 0)).toBe(handler1);

    // Change text to plain text
    rt.text = new TextSpan({ text: 'xyz' });
    layoutRT(rt);

    expect(rt.getOnClickAtPosition(0, 0)).toBeNull();
  });

  it('handles spans with both hyperlink and onClick', () => {
    const link: TextSpanHyperlink = { uri: 'https://example.com' };
    const handler = () => {};
    const span = new TextSpan({
      text: 'both',
      hyperlink: link,
      onClick: handler,
    });
    const rt = createRenderText(span);
    layoutRT(rt);

    expect(rt.getHyperlinkAtPosition(0, 0)!.uri).toBe('https://example.com');
    expect(rt.getOnClickAtPosition(0, 0)).toBe(handler);
  });

  it('inherits hyperlink from parent span', () => {
    const link: TextSpanHyperlink = { uri: 'https://parent.com' };
    const span = new TextSpan({
      hyperlink: link,
      children: [
        new TextSpan({ text: 'child' }),
      ],
    });
    const rt = createRenderText(span);
    layoutRT(rt);

    const result = rt.getHyperlinkAtPosition(0, 0);
    expect(result).not.toBeNull();
    expect(result!.uri).toBe('https://parent.com');
  });

  it('child hyperlink overrides parent hyperlink', () => {
    const parentLink: TextSpanHyperlink = { uri: 'https://parent.com' };
    const childLink: TextSpanHyperlink = { uri: 'https://child.com' };
    const span = new TextSpan({
      hyperlink: parentLink,
      children: [
        new TextSpan({ text: 'aaa' }),
        new TextSpan({ text: 'bbb', hyperlink: childLink }),
      ],
    });
    const rt = createRenderText(span);
    layoutRT(rt);

    // 'aaa' inherits parent hyperlink
    expect(rt.getHyperlinkAtPosition(0, 0)!.uri).toBe('https://parent.com');
    // 'bbb' uses its own hyperlink
    expect(rt.getHyperlinkAtPosition(3, 0)!.uri).toBe('https://child.com');
  });
});
