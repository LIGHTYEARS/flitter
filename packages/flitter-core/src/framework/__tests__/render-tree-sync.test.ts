/**
 * Render tree synchronization integration tests.
 *
 * Verifies that setState-driven widget swaps correctly update the render tree
 * and screen buffer. Covers:
 *   1. ParentData child type switch (Expanded child swap)
 *   2. Multi Expanded partial replace preserves order
 *   3. Conditional rendering switch (Welcome → ChatList)
 *   4. Multi-level ProxyElement nesting
 */

import { describe, it, expect, afterEach } from 'bun:test';
import { Widget, StatefulWidget, State, type BuildContext } from '../widget';
import { Column, Row } from '../../widgets/flex';
import { Center } from '../../widgets/center';
import { Expanded } from '../../widgets/flexible';
import { Text, RenderText } from '../../widgets/text';
import { TextSpan } from '../../core/text-span';
import { ContainerRenderBox } from '../render-object';
import { RenderFlex } from '../../layout/render-flex';
import { RenderCenter } from '../../widgets/center';
import { createTestBinding, collectRenderTree } from '../../test-utils/pipeline-helpers';

/**
 * Helper: create a Text widget from a plain string.
 */
function text(str: string): Text {
  return new Text({ text: new TextSpan({ text: str }) });
}

// ===========================================================================
// Test Group 1: ParentData child type switch (Expanded child swap)
// ===========================================================================

describe('Render tree sync: ParentData child type switch', () => {
  let cleanup: () => void;

  afterEach(() => {
    cleanup?.();
  });

  it('switches Expanded child from Center to Row and updates render tree + screen', () => {
    let testState: ExpandedSwapState | null = null;

    /**
     * State that toggles between Center(child: Text("A")) and Row(children: [Text("B")]).
     */
    class ExpandedSwapState extends State<ExpandedSwapWidget> {
      showRow = false;

      build(_context: BuildContext): Widget {
        return new Column({
          children: [
            new Expanded({
              child: this.showRow
                ? new Row({ children: [text('B')] })
                : new Center({ child: text('A') }),
            }),
          ],
        });
      }
    }

    class ExpandedSwapWidget extends StatefulWidget {
      createState(): ExpandedSwapState {
        const s = new ExpandedSwapState();
        testState = s;
        return s;
      }
    }

    const { binding, drawFrame, readRow, cleanup: c } = createTestBinding(80, 24);
    cleanup = c;

    binding.attachRootWidget(new ExpandedSwapWidget());
    drawFrame();

    let foundA = false;
    for (let r = 0; r < 24; r++) {
      if (readRow(r, 80).includes('A')) {
        foundA = true;
        break;
      }
    }
    expect(foundA).toBe(true);

    const rootRO = binding.pipelineOwner.rootNode!;
    expect(rootRO).toBeInstanceOf(RenderFlex);
    const columnFlex = rootRO as ContainerRenderBox;
    expect(columnFlex.children[0]).toBeInstanceOf(RenderCenter);

    testState!.setState(() => {
      testState!.showRow = true;
    });
    drawFrame();

    const firstChildAfter = columnFlex.children[0];
    expect(firstChildAfter).toBeInstanceOf(RenderFlex);
    expect(firstChildAfter).not.toBeInstanceOf(RenderCenter);

    let foundAAfter = false;
    let foundB = false;
    for (let r = 0; r < 24; r++) {
      const row = readRow(r, 80);
      if (row.includes('A')) foundAAfter = true;
      if (row.includes('B')) foundB = true;
    }
    expect(foundAAfter).toBe(false);
    expect(foundB).toBe(true);

    const tree = collectRenderTree(rootRO);
    const classNames = tree.map((n) => n.className);
    expect(classNames).toContain('RenderFlex');
    expect(classNames).not.toContain('RenderCenter');
  });
});

// ===========================================================================
// Test Group 2: Multi Expanded partial replace preserves order
// ===========================================================================

describe('Render tree sync: Multi Expanded partial replace preserves order', () => {
  let cleanup: () => void;

  afterEach(() => {
    cleanup?.();
  });

  it('replaces only idx=0 child while preserving idx=1 and idx=2 order', () => {
    let testState: MultiExpandedState | null = null;

    /**
     * State with three Expanded children. Allows replacing the first child
     * from Text("FIRST") to Row(children: [Text("REPLACED")]).
     */
    class MultiExpandedState extends State<MultiExpandedWidget> {
      replaced = false;

      build(_context: BuildContext): Widget {
        return new Column({
          children: [
            new Expanded({
              child: this.replaced
                ? new Row({ children: [text('REPLACED')] })
                : text('FIRST'),
            }),
            new Expanded({ child: text('SECOND') }),
            new Expanded({ child: text('THIRD') }),
          ],
        });
      }
    }

    class MultiExpandedWidget extends StatefulWidget {
      createState(): MultiExpandedState {
        const s = new MultiExpandedState();
        testState = s;
        return s;
      }
    }

    const { binding, drawFrame, cleanup: c } = createTestBinding(80, 24);
    cleanup = c;

    binding.attachRootWidget(new MultiExpandedWidget());
    drawFrame();

    const rootRO = binding.pipelineOwner.rootNode!;
    expect(rootRO).toBeInstanceOf(RenderFlex);
    const columnFlex = rootRO as ContainerRenderBox;
    expect(columnFlex.children.length).toBe(3);

    expect(columnFlex.children[0]).toBeInstanceOf(RenderText);
    expect(columnFlex.children[1]).toBeInstanceOf(RenderText);
    expect(columnFlex.children[2]).toBeInstanceOf(RenderText);

    testState!.setState(() => {
      testState!.replaced = true;
    });
    drawFrame();

    expect(columnFlex.children.length).toBe(3);

    const child0 = columnFlex.children[0];
    const child1 = columnFlex.children[1];
    const child2 = columnFlex.children[2];

    expect(child0).toBeInstanceOf(RenderFlex);
    expect(child0).not.toBeInstanceOf(RenderText);

    expect(child1).toBeInstanceOf(RenderText);
    expect(child2).toBeInstanceOf(RenderText);
  });
});

// ===========================================================================
// Test Group 3: Conditional rendering switch (Welcome → ChatList)
// ===========================================================================

describe('Render tree sync: Conditional rendering (Welcome → ChatList)', () => {
  let cleanup: () => void;

  afterEach(() => {
    cleanup?.();
  });

  it('switches from Center("Welcome") to Column with chat items', () => {
    let testState: ChatState | null = null;

    /**
     * State simulating a chat screen: shows "Welcome" when items is empty,
     * shows a Column of Text items otherwise.
     */
    class ChatState extends State<ChatWidget> {
      items: string[] = [];

      build(_context: BuildContext): Widget {
        if (this.items.length === 0) {
          return new Center({ child: text('Welcome') });
        }
        return new Column({
          children: this.items.map((item) => text(item)),
        });
      }
    }

    class ChatWidget extends StatefulWidget {
      createState(): ChatState {
        const s = new ChatState();
        testState = s;
        return s;
      }
    }

    const { binding, drawFrame, readRow, cleanup: c } = createTestBinding(80, 24);
    cleanup = c;

    binding.attachRootWidget(new ChatWidget());
    drawFrame();

    const welcomeScreen = readRow(0, 80);
    let foundWelcome = false;
    for (let r = 0; r < 24; r++) {
      if (readRow(r, 80).includes('Welcome')) {
        foundWelcome = true;
        break;
      }
    }
    expect(foundWelcome).toBe(true);

    testState!.setState(() => {
      testState!.items = ['User: hi'];
    });
    drawFrame();

    let foundUserHi = false;
    let foundWelcomeAfter = false;
    for (let r = 0; r < 24; r++) {
      const row = readRow(r, 80);
      if (row.includes('User: hi')) foundUserHi = true;
      if (row.includes('Welcome')) foundWelcomeAfter = true;
    }
    expect(foundUserHi).toBe(true);
    expect(foundWelcomeAfter).toBe(false);
  });
});

// ===========================================================================
// Test Group 4: Multi-level ProxyElement nesting
// ===========================================================================

describe('Render tree sync: Multi-level ProxyElement nesting', () => {
  let cleanup: () => void;

  afterEach(() => {
    cleanup?.();
  });

  it('replaces deeply nested Expanded > Center to Expanded > Row at the correct ancestor', () => {
    let testState: DeepProxyState | null = null;

    /**
     * State testing deep ProxyElement nesting:
     * Column > Expanded > (Center or Row).
     * Verifies that the render object swap happens at the Column's RenderFlex level.
     */
    class DeepProxyState extends State<DeepProxyWidget> {
      swapped = false;

      build(_context: BuildContext): Widget {
        return new Column({
          children: [
            new Expanded({
              child: this.swapped
                ? new Row({ children: [text('swapped')] })
                : new Center({ child: text('deep') }),
            }),
          ],
        });
      }
    }

    class DeepProxyWidget extends StatefulWidget {
      createState(): DeepProxyState {
        const s = new DeepProxyState();
        testState = s;
        return s;
      }
    }

    const { binding, drawFrame, readRow, cleanup: c } = createTestBinding(80, 24);
    cleanup = c;

    binding.attachRootWidget(new DeepProxyWidget());
    drawFrame();

    const rootRO = binding.pipelineOwner.rootNode!;
    expect(rootRO).toBeInstanceOf(RenderFlex);

    const columnFlex = rootRO as ContainerRenderBox;
    expect(columnFlex.children.length).toBe(1);
    expect(columnFlex.children[0]).toBeInstanceOf(RenderCenter);

    let foundDeep = false;
    for (let r = 0; r < 24; r++) {
      if (readRow(r, 80).includes('deep')) {
        foundDeep = true;
        break;
      }
    }
    expect(foundDeep).toBe(true);

    testState!.setState(() => {
      testState!.swapped = true;
    });
    drawFrame();

    expect(columnFlex.children[0]).toBeInstanceOf(RenderFlex);
    expect(columnFlex.children[0]).not.toBeInstanceOf(RenderCenter);

    const tree = collectRenderTree(rootRO);
    const topLevel = tree[0];
    expect(topLevel!.className).toBe('RenderFlex');
    expect(topLevel!.childCount).toBe(1);

    const renderFlexEntries = tree.filter((n) => n.className === 'RenderFlex');
    expect(renderFlexEntries.length).toBe(2);

    let foundSwapped = false;
    for (let r = 0; r < 24; r++) {
      if (readRow(r, 80).includes('swapped')) {
        foundSwapped = true;
        break;
      }
    }
    expect(foundSwapped).toBe(true);

    let foundDeepAfter = false;
    for (let r = 0; r < 24; r++) {
      if (readRow(r, 80).includes('deep')) {
        foundDeepAfter = true;
        break;
      }
    }
    expect(foundDeepAfter).toBe(false);
  });
});
