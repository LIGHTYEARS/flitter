import {
  Widget,
  StatefulWidget,
  State,
  type BuildContext,
} from '../framework/widget';
import { Key } from '../core/key';
import { Column } from './flex';
import { SizedBox } from './sized-box';
import { SingleChildScrollView } from './scroll-view';
import { ScrollController } from './scroll-controller';

// ---------------------------------------------------------------------------
// ListView
// ---------------------------------------------------------------------------

export class ListView extends StatefulWidget {
  readonly itemCount: number;
  readonly itemBuilder: (index: number) => Widget;
  readonly itemExtent: number;
  readonly scrollController?: ScrollController;
  readonly scrollDirection: 'vertical' | 'horizontal';
  readonly bufferCount: number;

  constructor(opts: {
    key?: Key;
    itemCount: number;
    itemBuilder: (index: number) => Widget;
    itemExtent?: number;
    scrollController?: ScrollController;
    scrollDirection?: 'vertical' | 'horizontal';
    bufferCount?: number;
  }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.itemCount = opts.itemCount;
    this.itemBuilder = opts.itemBuilder;
    this.itemExtent = opts.itemExtent ?? 1;
    this.scrollController = opts.scrollController;
    this.scrollDirection = opts.scrollDirection ?? 'vertical';
    this.bufferCount = opts.bufferCount ?? 5;
  }

  static builder(opts: {
    key?: Key;
    itemCount: number;
    itemBuilder: (index: number) => Widget;
    itemExtent?: number;
    scrollController?: ScrollController;
    scrollDirection?: 'vertical' | 'horizontal';
    bufferCount?: number;
  }): ListView {
    return new ListView(opts);
  }

  createState(): State<ListView> {
    return new ListViewState();
  }
}

// ---------------------------------------------------------------------------
// ListViewState
// ---------------------------------------------------------------------------

class ListViewState extends State<ListView> {
  private _ownController?: ScrollController;

  private get _controller(): ScrollController {
    return this.widget.scrollController ?? this._ownController!;
  }

  private _onScrollChanged = (): void => {
    if (this.mounted) {
      this.setState();
    }
  };

  initState(): void {
    super.initState();
    if (!this.widget.scrollController) {
      this._ownController = new ScrollController();
    }
    this._controller.addListener(this._onScrollChanged);
  }

  didUpdateWidget(oldWidget: ListView): void {
    const oldCtrl = oldWidget.scrollController ?? this._ownController;
    const newCtrl = this.widget.scrollController;

    if (newCtrl && !oldWidget.scrollController) {
      this._ownController?.removeListener(this._onScrollChanged);
      this._ownController?.dispose();
      this._ownController = undefined;
      newCtrl.addListener(this._onScrollChanged);
    } else if (!newCtrl && oldWidget.scrollController) {
      oldWidget.scrollController.removeListener(this._onScrollChanged);
      this._ownController = new ScrollController();
      this._ownController.addListener(this._onScrollChanged);
    } else if (oldCtrl !== this._controller) {
      oldCtrl?.removeListener(this._onScrollChanged);
      this._controller.addListener(this._onScrollChanged);
    }
  }

  dispose(): void {
    this._controller.removeListener(this._onScrollChanged);
    if (this._ownController) {
      this._ownController.dispose();
      this._ownController = undefined;
    }
    super.dispose();
  }

  build(_context: BuildContext): Widget {
    const ctrl = this._controller;
    const { itemCount, itemExtent, bufferCount, scrollDirection } = this.widget;

    const totalExtent = itemCount * itemExtent;
    const viewportSize = ctrl.viewportSize;
    const scrollOffset = ctrl.offset;

    let firstVisible: number;
    let lastVisible: number;

    if (viewportSize > 0) {
      firstVisible = Math.max(0, Math.floor(scrollOffset / itemExtent) - bufferCount);
      lastVisible = Math.min(
        itemCount - 1,
        Math.ceil((scrollOffset + viewportSize) / itemExtent) + bufferCount,
      );
    } else {
      firstVisible = 0;
      lastVisible = Math.min(itemCount - 1, bufferCount * 2);
    }

    const isVertical = scrollDirection === 'vertical';
    const leadingSpace = firstVisible * itemExtent;
    const trailingItemEnd = (lastVisible + 1) * itemExtent;
    const trailingSpace = Math.max(0, totalExtent - trailingItemEnd);

    const children: Widget[] = [];

    if (leadingSpace > 0) {
      children.push(isVertical
        ? new SizedBox({ height: leadingSpace })
        : new SizedBox({ width: leadingSpace }),
      );
    }

    for (let i = firstVisible; i <= lastVisible && i < itemCount; i++) {
      children.push(this.widget.itemBuilder(i));
    }

    if (trailingSpace > 0) {
      children.push(isVertical
        ? new SizedBox({ height: trailingSpace })
        : new SizedBox({ width: trailingSpace }),
      );
    }

    const column = new Column({
      children,
      crossAxisAlignment: 'stretch',
      mainAxisSize: 'min',
    });

    return new SingleChildScrollView({
      controller: ctrl,
      scrollDirection,
      child: column,
    });
  }
}
