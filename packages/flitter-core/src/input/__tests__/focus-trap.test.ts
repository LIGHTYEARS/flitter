// FocusScopeNode.trapFocus 焦点陷阱测试
// trapFocus 属性尚未实现，这些测试预期会失败
import { describe, test, expect, beforeEach } from 'bun:test';
import { FocusNode, FocusScopeNode, FocusManager } from '../focus';

// 每个测试前重置 FocusManager 单例
beforeEach(() => {
  FocusManager.reset();
});

describe('FocusScopeNode trapFocus', () => {
  /**
   * 测试场景：trapFocus=true 时 Tab 不跳出 scope
   *
   * 树结构：
   *   rootScope
   *   ├── outsideBefore (scope 外的节点)
   *   ├── scope (FocusScopeNode, trapFocus=true)
   *   │   ├── inner1
   *   │   ├── inner2
   *   │   └── inner3
   *   └── outsideAfter (scope 外的节点)
   *
   * 期望行为：
   *   当焦点在 inner3（scope 内最后一个节点）时，
   *   调用 nextFocus() 应该回到 inner1（scope 内第一个节点），
   *   而不是跳到 outsideAfter。
   *   类似地，当焦点在 inner1 时，调用 previousFocus() 应该
   *   回到 inner3，而不是跳到 outsideBefore。
   */
  test('trapFocus=true 时 Tab 遍历到最后一个节点后回到第一个（不跳出 scope）', () => {
    const mgr = FocusManager.instance;

    // scope 外的节点
    const outsideBefore = new FocusNode({ debugLabel: 'outsideBefore' });
    mgr.registerNode(outsideBefore, null);

    // 设置 trapFocus=true 的 FocusScopeNode
    const scope = new FocusScopeNode({
      debugLabel: 'trappedScope',
    });
    // trapFocus 属性尚未实现，此赋值预期会触发测试失败
    (scope as any).trapFocus = true;
    mgr.registerNode(scope, null);

    // scope 内的 3 个可聚焦节点
    const inner1 = new FocusNode({ debugLabel: 'inner1' });
    const inner2 = new FocusNode({ debugLabel: 'inner2' });
    const inner3 = new FocusNode({ debugLabel: 'inner3' });
    mgr.registerNode(inner1, scope);
    mgr.registerNode(inner2, scope);
    mgr.registerNode(inner3, scope);

    // scope 外的节点
    const outsideAfter = new FocusNode({ debugLabel: 'outsideAfter' });
    mgr.registerNode(outsideAfter, null);

    // 聚焦到 scope 内最后一个节点
    inner3.requestFocus();
    expect(inner3.hasPrimaryFocus).toBe(true);

    // 模拟 Tab（nextFocus）—— 应该回到 scope 内第一个节点 inner1
    inner3.nextFocus();
    expect(inner1.hasPrimaryFocus).toBe(true);

    // 验证焦点没有跳到 scope 外
    expect(outsideAfter.hasPrimaryFocus).toBe(false);
    expect(outsideBefore.hasPrimaryFocus).toBe(false);

    // 继续正向遍历，确保 scope 内正常流转
    inner1.nextFocus();
    expect(inner2.hasPrimaryFocus).toBe(true);

    inner2.nextFocus();
    expect(inner3.hasPrimaryFocus).toBe(true);
  });

  /**
   * 测试场景：trapFocus=true 时 Shift+Tab 也不跳出 scope
   *
   * 期望行为：
   *   当焦点在 inner1（scope 内第一个节点）时，
   *   调用 previousFocus() 应该回到 inner3（scope 内最后一个节点），
   *   而不是跳到 outsideBefore。
   */
  test('trapFocus=true 时 Shift+Tab 遍历到第一个节点后回到最后一个（不跳出 scope）', () => {
    const mgr = FocusManager.instance;

    const outsideBefore = new FocusNode({ debugLabel: 'outsideBefore' });
    mgr.registerNode(outsideBefore, null);

    const scope = new FocusScopeNode({
      debugLabel: 'trappedScope',
    });
    (scope as any).trapFocus = true;
    mgr.registerNode(scope, null);

    const inner1 = new FocusNode({ debugLabel: 'inner1' });
    const inner2 = new FocusNode({ debugLabel: 'inner2' });
    const inner3 = new FocusNode({ debugLabel: 'inner3' });
    mgr.registerNode(inner1, scope);
    mgr.registerNode(inner2, scope);
    mgr.registerNode(inner3, scope);

    const outsideAfter = new FocusNode({ debugLabel: 'outsideAfter' });
    mgr.registerNode(outsideAfter, null);

    // 聚焦到 scope 内第一个节点
    inner1.requestFocus();
    expect(inner1.hasPrimaryFocus).toBe(true);

    // 模拟 Shift+Tab（previousFocus）—— 应该回到 scope 内最后一个节点 inner3
    inner1.previousFocus();
    expect(inner3.hasPrimaryFocus).toBe(true);

    // 验证焦点没有跳到 scope 外
    expect(outsideBefore.hasPrimaryFocus).toBe(false);
    expect(outsideAfter.hasPrimaryFocus).toBe(false);
  });

  /**
   * 测试场景：trapFocus=false（默认）时正常遍历，焦点可以跳出 scope
   *
   * 树结构同上，但 scope 不设置 trapFocus（默认 false）。
   *
   * 期望行为：
   *   当焦点在 inner3 时，调用 nextFocus() 应该跳到 scope 外的
   *   下一个可聚焦节点（outsideAfter），而不是回到 inner1。
   */
  test('trapFocus=false（默认）时 Tab 遍历可以正常跳出 scope', () => {
    const mgr = FocusManager.instance;

    const outsideBefore = new FocusNode({ debugLabel: 'outsideBefore' });
    mgr.registerNode(outsideBefore, null);

    // 不设置 trapFocus（默认 false）
    const scope = new FocusScopeNode({
      debugLabel: 'normalScope',
    });
    mgr.registerNode(scope, null);

    const inner1 = new FocusNode({ debugLabel: 'inner1' });
    const inner2 = new FocusNode({ debugLabel: 'inner2' });
    const inner3 = new FocusNode({ debugLabel: 'inner3' });
    mgr.registerNode(inner1, scope);
    mgr.registerNode(inner2, scope);
    mgr.registerNode(inner3, scope);

    const outsideAfter = new FocusNode({ debugLabel: 'outsideAfter' });
    mgr.registerNode(outsideAfter, null);

    // 聚焦到 scope 内最后一个节点
    inner3.requestFocus();
    expect(inner3.hasPrimaryFocus).toBe(true);

    // Tab（nextFocus）—— 应该跳到 scope 外的下一个节点 outsideAfter
    inner3.nextFocus();
    expect(outsideAfter.hasPrimaryFocus).toBe(true);

    // 验证没有回到 scope 内
    expect(inner1.hasPrimaryFocus).toBe(false);
  });
});
