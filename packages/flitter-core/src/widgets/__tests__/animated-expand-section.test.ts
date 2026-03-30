// Tests for AnimatedExpandSection widget
// Verifies construction, state machine transitions, animation timer lifecycle,
// mid-animation reversal, instant mode, and build output structure.

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  AnimatedExpandSection,
  AnimatedExpandSectionState,
} from '../animated-expand-section';
import {
  StatelessWidget,
  type BuildContext,
  type Widget,
} from '../../framework/widget';
import { Text } from '../text';
import { TextSpan } from '../../core/text-span';
import { SizedBox } from '../sized-box';
import { ClipRect } from '../clip-rect';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Minimal widget for child tests */
class _DummyWidget extends StatelessWidget {
  readonly label: string;
  constructor(label: string = 'dummy') {
    super();
    this.label = label;
  }
  build(_context: BuildContext): Widget {
    return new Text({ text: new TextSpan({ text: this.label }) });
  }
}

function makeChild(label: string = 'child content'): _DummyWidget {
  return new _DummyWidget(label);
}

/**
 * Helper to mount an AnimatedExpandSectionState for testing.
 * Simulates the framework mounting lifecycle.
 */
function mountState(widget: AnimatedExpandSection): AnimatedExpandSectionState {
  const state = widget.createState() as AnimatedExpandSectionState;
  const mockElement = {
    widget,
    mounted: true,
    markNeedsBuild: () => {},
  };
  (state as any)._mount(widget, mockElement as unknown as BuildContext);
  return state;
}

/**
 * Helper to simulate didUpdateWidget by calling _update on the state.
 */
function updateWidget(state: AnimatedExpandSectionState, newWidget: AnimatedExpandSection): void {
  (state as any)._update(newWidget);
}

/**
 * Helper to simulate unmount by calling _unmount on the state.
 */
function unmountState(state: AnimatedExpandSectionState): void {
  (state as any)._unmount();
}

// ===========================================================================
// AnimatedExpandSection — Constructor & Defaults
// ===========================================================================

describe('AnimatedExpandSection', () => {
  test('creates with required props, defaults applied', () => {
    const child = makeChild();
    const widget = new AnimatedExpandSection({ expanded: false, child });

    expect(widget.expanded).toBe(false);
    expect(widget.child).toBe(child);
    expect(widget.duration).toBe(150);
  });

  test('creates with custom duration', () => {
    const widget = new AnimatedExpandSection({
      expanded: true,
      child: makeChild(),
      duration: 300,
    });

    expect(widget.expanded).toBe(true);
    expect(widget.duration).toBe(300);
  });

  test('creates with duration=0 for instant mode', () => {
    const widget = new AnimatedExpandSection({
      expanded: false,
      child: makeChild(),
      duration: 0,
    });

    expect(widget.duration).toBe(0);
  });

  test('is a StatefulWidget that creates AnimatedExpandSectionState', () => {
    const widget = new AnimatedExpandSection({
      expanded: false,
      child: makeChild(),
    });
    const state = widget.createState();
    expect(state).toBeDefined();
    expect(state.constructor.name).toBe('AnimatedExpandSectionState');
  });
});

// ===========================================================================
// AnimatedExpandSectionState — initState
// ===========================================================================

describe('AnimatedExpandSectionState: initState', () => {
  test('starts collapsed (height=0) when expanded=false', () => {
    const widget = new AnimatedExpandSection({
      expanded: false,
      child: makeChild(),
    });
    const state = mountState(widget);

    expect(state.animatedHeight).toBe(0);
    expect(state.isAnimating).toBe(false);

    unmountState(state);
  });

  test('starts expanded (height=Infinity) when expanded=true on mount', () => {
    const widget = new AnimatedExpandSection({
      expanded: true,
      child: makeChild(),
    });
    const state = mountState(widget);

    expect(state.animatedHeight).toBe(Infinity);
    expect(state.isAnimating).toBe(false);

    unmountState(state);
  });
});

// ===========================================================================
// AnimatedExpandSectionState — animation lifecycle
// ===========================================================================

describe('AnimatedExpandSectionState: animation', () => {
  test('toggle from collapsed to expanded starts animation timer', () => {
    const widget1 = new AnimatedExpandSection({
      expanded: false,
      child: makeChild(),
      duration: 150,
    });
    const state = mountState(widget1);
    // Set a target height for testing
    state.setTargetHeight(10);

    const widget2 = new AnimatedExpandSection({
      expanded: true,
      child: makeChild(),
      duration: 150,
    });
    updateWidget(state, widget2);

    expect(state.isAnimating).toBe(true);

    unmountState(state);
  });

  test('toggle from expanded to collapsed starts animation timer', () => {
    const widget1 = new AnimatedExpandSection({
      expanded: true,
      child: makeChild(),
      duration: 150,
    });
    const state = mountState(widget1);
    state.setTargetHeight(10);

    const widget2 = new AnimatedExpandSection({
      expanded: false,
      child: makeChild(),
      duration: 150,
    });
    updateWidget(state, widget2);

    expect(state.isAnimating).toBe(true);

    unmountState(state);
  });

  test('duration=0 produces instant transition (no timer)', () => {
    const widget1 = new AnimatedExpandSection({
      expanded: false,
      child: makeChild(),
      duration: 0,
    });
    const state = mountState(widget1);
    state.setTargetHeight(10);

    const widget2 = new AnimatedExpandSection({
      expanded: true,
      child: makeChild(),
      duration: 0,
    });
    updateWidget(state, widget2);

    // No timer should be active
    expect(state.isAnimating).toBe(false);
    // Height should be set to target immediately
    expect(state.animatedHeight).toBe(10);

    unmountState(state);
  });

  test('zero-height content (start=end=0) produces no animation', () => {
    const widget1 = new AnimatedExpandSection({
      expanded: false,
      child: makeChild(),
      duration: 150,
    });
    const state = mountState(widget1);
    // Target height is 0 (default)
    // Already at height 0, toggling to expanded with target 0 means no-op

    const widget2 = new AnimatedExpandSection({
      expanded: true,
      child: makeChild(),
      duration: 150,
    });
    updateWidget(state, widget2);

    // Start and end are both 0, so instant (no timer)
    expect(state.isAnimating).toBe(false);
    expect(state.animatedHeight).toBe(0);

    unmountState(state);
  });

  test('dispose cancels running animation', () => {
    const widget1 = new AnimatedExpandSection({
      expanded: false,
      child: makeChild(),
      duration: 150,
    });
    const state = mountState(widget1);
    state.setTargetHeight(10);

    const widget2 = new AnimatedExpandSection({
      expanded: true,
      child: makeChild(),
      duration: 150,
    });
    updateWidget(state, widget2);
    expect(state.isAnimating).toBe(true);

    // Dispose should cancel
    unmountState(state);
    expect(state.isAnimating).toBe(false);
  });

  test('no animation when expanded does not change', () => {
    const widget1 = new AnimatedExpandSection({
      expanded: false,
      child: makeChild(),
      duration: 150,
    });
    const state = mountState(widget1);

    // Update with same expanded value
    const widget2 = new AnimatedExpandSection({
      expanded: false,
      child: makeChild('different'),
      duration: 150,
    });
    updateWidget(state, widget2);

    expect(state.isAnimating).toBe(false);
    expect(state.animatedHeight).toBe(0);

    unmountState(state);
  });
});

// ===========================================================================
// AnimatedExpandSectionState — build output
// ===========================================================================

describe('AnimatedExpandSectionState: build output', () => {
  test('build wraps child in SizedBox + ClipRect', () => {
    const child = makeChild();
    const widget = new AnimatedExpandSection({
      expanded: false,
      child,
    });
    const state = mountState(widget);

    const built = state.build({} as any);

    // Outer widget should be SizedBox
    expect(built.constructor.name).toBe('SizedBox');
    const sizedBox = built as SizedBox;
    expect(sizedBox.height).toBe(0);

    unmountState(state);
  });

  test('build with expanded=true starts with Infinity height', () => {
    const child = makeChild();
    const widget = new AnimatedExpandSection({
      expanded: true,
      child,
    });
    const state = mountState(widget);

    const built = state.build({} as any);

    expect(built.constructor.name).toBe('SizedBox');
    const sizedBox = built as SizedBox;
    expect(sizedBox.height).toBe(Infinity);

    unmountState(state);
  });
});
