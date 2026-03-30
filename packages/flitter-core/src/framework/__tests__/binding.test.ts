// Tests for WidgetsBinding, runApp, and ErrorWidget
// Amp ref: J3 (WidgetsBinding), cz8 (runApp)

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { WidgetsBinding, runApp, resetSchedulers } from '../binding';
import { ErrorWidget, RenderErrorBox } from '../error-widget';
import { Widget, StatelessWidget, type BuildContext } from '../widget';
import {
  StatelessElement,
  LeafRenderObjectElement,
  Element,
} from '../element';
import {
  LeafRenderObjectWidget,
  RenderBox,
  RenderObject,
} from '../render-object';
import { BoxConstraints } from '../../core/box-constraints';
import { Offset, Size } from '../../core/types';

// ---------------------------------------------------------------------------
// Test helpers — using Leaf widgets to avoid infinite recursion
// ---------------------------------------------------------------------------

/** A minimal render box for testing. */
class TestRenderBox extends RenderBox {
  performLayout(): void {
    if (this.constraints) {
      this.size = this.constraints.constrain(
        new Size(this.constraints.maxWidth, this.constraints.maxHeight),
      );
    }
  }
  paint(): void {}
}

/** A leaf widget that creates a render object — terminates the tree. */
class LeafTestWidget extends LeafRenderObjectWidget {
  createRenderObject(): RenderObject {
    return new TestRenderBox();
  }
}

/** A StatelessWidget that builds a LeafTestWidget — proper tree termination. */
class TestWidget extends StatelessWidget {
  buildCount = 0;

  build(_context: BuildContext): Widget {
    this.buildCount++;
    return new LeafTestWidget();
  }

  override createElement(): StatelessElement {
    return new StatelessElement(this);
  }
}

// ---------------------------------------------------------------------------
// WidgetsBinding tests
// ---------------------------------------------------------------------------

describe('WidgetsBinding', () => {
  beforeEach(() => {
    WidgetsBinding.reset();
  });

  afterEach(() => {
    WidgetsBinding.reset();
  });

  describe('singleton', () => {
    it('returns the same instance', () => {
      const a = WidgetsBinding.instance;
      const b = WidgetsBinding.instance;
      expect(a).toBe(b);
    });

    it('reset() allows fresh instance for testing', () => {
      const a = WidgetsBinding.instance;
      WidgetsBinding.reset();
      const b = WidgetsBinding.instance;
      expect(a).not.toBe(b);
    });
  });

  describe('attachRootWidget', () => {
    it('creates root element', () => {
      const binding = WidgetsBinding.instance;
      const widget = new TestWidget();
      binding.attachRootWidget(widget);

      expect(binding.rootElement).not.toBeNull();
    });

    it('sets isRunning to true', () => {
      const binding = WidgetsBinding.instance;
      expect(binding.isRunning).toBe(false);
      binding.attachRootWidget(new TestWidget());
      expect(binding.isRunning).toBe(true);
    });

    it('root element is mounted', () => {
      const binding = WidgetsBinding.instance;
      binding.attachRootWidget(new TestWidget());
      expect(binding.rootElement!.mounted).toBe(true);
    });
  });

  describe('handleResize', () => {
    it('updates constraints', () => {
      const binding = WidgetsBinding.instance;
      binding.attachRootWidget(new TestWidget());
      binding.handleResize(120, 40);
    });

    it('propagates new size to root render object after drawFrameSync', () => {
      const binding = WidgetsBinding.instance;
      binding.attachRootWidget(new TestWidget());
      binding.drawFrameSync();

      binding.handleResize(224, 64);
      binding.drawFrameSync();

      const rootRO = binding.pipelineOwner.rootNode;
      expect(rootRO).not.toBeNull();
      expect(rootRO!.size.width).toBe(224);
      expect(rootRO!.size.height).toBe(64);
    });

    it('default test size is 80x24 before any resize', () => {
      const binding = WidgetsBinding.instance;
      binding.attachRootWidget(new TestWidget());
      binding.drawFrameSync();

      const rootRO = binding.pipelineOwner.rootNode;
      expect(rootRO).not.toBeNull();
      expect(rootRO!.size.width).toBe(80);
      expect(rootRO!.size.height).toBe(24);
    });
  });

  describe('drawFrameSync', () => {
    it('runs build -> layout -> paint sequence', () => {
      const binding = WidgetsBinding.instance;
      binding.attachRootWidget(new TestWidget());

      // Should not throw — runs all three phases synchronously
      binding.drawFrameSync();
    });

    it('processes dirty elements during build phase', () => {
      const binding = WidgetsBinding.instance;
      const widget = new TestWidget();
      binding.attachRootWidget(widget);

      // The root element was already built during attachRootWidget.
      // Schedule a child dirty and run a frame.
      const root = binding.rootElement!;
      if (root.children.length > 0) {
        const child = root.children[0];
        child._dirty = true;
        binding.buildOwner.scheduleBuildFor(child);
      }

      binding.drawFrameSync();
      expect(binding.buildOwner.hasDirtyElements).toBe(false);
    });
  });

  describe('stop', () => {
    it('unmounts root element', () => {
      const binding = WidgetsBinding.instance;
      binding.attachRootWidget(new TestWidget());
      expect(binding.rootElement).not.toBeNull();

      binding.stop();
      expect(binding.rootElement).toBeNull();
      expect(binding.isRunning).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// runApp tests
// ---------------------------------------------------------------------------

describe('runApp', () => {
  beforeEach(() => {
    WidgetsBinding.reset();
  });

  afterEach(() => {
    WidgetsBinding.reset();
  });

  it('creates binding and attaches widget', async () => {
    const widget = new TestWidget();
    const binding = await runApp(widget);

    expect(binding).toBe(WidgetsBinding.instance);
    expect(binding.rootElement).not.toBeNull();
    expect(binding.isRunning).toBe(true);
  });

  it('returns the binding instance', async () => {
    const binding = await runApp(new TestWidget());
    expect(binding).toBeInstanceOf(WidgetsBinding);
  });

  it('root element is properly mounted', async () => {
    const binding = await runApp(new TestWidget());
    expect(binding.rootElement!.mounted).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ErrorWidget tests
// ---------------------------------------------------------------------------

describe('ErrorWidget', () => {
  beforeEach(() => {
    WidgetsBinding.reset();
  });

  afterEach(() => {
    WidgetsBinding.reset();
  });

  it('stores message', () => {
    const ew = new ErrorWidget({ message: 'Something went wrong' });
    expect(ew.message).toBe('Something went wrong');
  });

  it('stores error', () => {
    const error = new Error('test error');
    const ew = new ErrorWidget({ message: 'fail', error });
    expect(ew.error).toBe(error);
  });

  it('fromError creates widget with message', () => {
    const error = new Error('Build failed');
    const ew = ErrorWidget.fromError(error);
    expect(ew.message).toBe('Build failed');
    expect(ew.error).toBe(error);
  });

  it('has correct message from fromError', () => {
    const ew = ErrorWidget.fromError(new Error('oops'));
    expect(ew.message).toBe('oops');
  });

  it('createRenderObject returns RenderErrorBox with message', () => {
    const ew = new ErrorWidget({ message: 'test error' });
    const renderObj = ew.createRenderObject();
    expect(renderObj).toBeInstanceOf(RenderErrorBox);
    expect(renderObj.message).toBe('test error');
  });

  it('createElement returns LeafRenderObjectElement', () => {
    const ew = new ErrorWidget({ message: 'test' });
    const elem = ew.createElement();
    expect(elem).toBeInstanceOf(LeafRenderObjectElement);
  });
});
