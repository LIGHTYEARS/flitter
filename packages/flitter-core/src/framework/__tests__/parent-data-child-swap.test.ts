import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { Widget, StatefulWidget, State, BuildContext } from '../widget';
import { Column, Row } from '../../widgets/flex';
import { Center } from '../../widgets/center';
import { Expanded } from '../../widgets/flexible';
import { SizedBox } from '../../widgets/sized-box';
import { WidgetsBinding } from '../binding';
import { FrameScheduler } from '../../scheduler/frame-scheduler';
import { ContainerRenderBox } from '../render-object';
import { RenderFlex } from '../../layout/render-flex';
import { RenderCenter } from '../../widgets/center';

let testState: SwapTestState | null = null;

class SwapTestState extends State<SwapTestWidget> {
  showRow = false;

  build(_context: BuildContext): Widget {
    return new Column({
      children: [
        new Expanded({
          child: this.showRow
            ? new Row({ children: [] })
            : new Center({
                child: new SizedBox({ width: 1, height: 1 }),
              }),
        }),
      ],
    });
  }
}

class SwapTestWidget extends StatefulWidget {
  createState(): SwapTestState {
    const state = new SwapTestState();
    testState = state;
    return state;
  }
}

describe('ParentData child swap', () => {
  beforeEach(() => {
    WidgetsBinding.reset();
    FrameScheduler.reset();
    testState = null;
  });

  afterEach(() => {
    WidgetsBinding.reset();
    FrameScheduler.reset();
    testState = null;
  });

  test('Expanded child type change updates render tree correctly', () => {
    const binding = WidgetsBinding.instance;
    binding.attachRootWidget(new SwapTestWidget());
    binding.drawFrameSync();

    const rootRO = binding.pipelineOwner.rootNode;
    expect(rootRO).not.toBeNull();
    expect(rootRO).toBeInstanceOf(RenderFlex);

    const columnFlex = rootRO as RenderFlex;
    expect((columnFlex as ContainerRenderBox).children.length).toBe(1);

    const firstChildBefore = (columnFlex as ContainerRenderBox).children[0];
    expect(firstChildBefore).toBeInstanceOf(RenderCenter);

    testState!.setState(() => {
      testState!.showRow = true;
    });
    binding.drawFrameSync();

    const firstChildAfter = (columnFlex as ContainerRenderBox).children[0];
    expect(firstChildAfter).not.toBe(firstChildBefore);
    expect(firstChildAfter).toBeInstanceOf(RenderFlex);
    expect(firstChildAfter).not.toBeInstanceOf(RenderCenter);
  });

  test('Expanded child type change from Row back to Center', () => {
    const binding = WidgetsBinding.instance;
    binding.attachRootWidget(new SwapTestWidget());
    binding.drawFrameSync();

    testState!.setState(() => {
      testState!.showRow = true;
    });
    binding.drawFrameSync();

    const rootRO = binding.pipelineOwner.rootNode as RenderFlex;
    const childAfterFirstSwap = (rootRO as ContainerRenderBox).children[0];
    expect(childAfterFirstSwap).toBeInstanceOf(RenderFlex);

    testState!.setState(() => {
      testState!.showRow = false;
    });
    binding.drawFrameSync();

    const childAfterSecondSwap = (rootRO as ContainerRenderBox).children[0];
    expect(childAfterSecondSwap).toBeInstanceOf(RenderCenter);
    expect(childAfterSecondSwap).not.toBe(childAfterFirstSwap);
  });
});
