// ShortcutRegistry 的 failing tests
// ShortcutRegistry 类尚未实现，这些测试用于驱动其 API 设计
import { describe, test, expect } from 'bun:test';
import { ShortcutRegistry } from '../../input/shortcut-registry';

describe('ShortcutRegistry', () => {
  /**
   * 测试 register() 注册快捷键
   * 注册一个 ctrl+s 的快捷键条目后，registry 应包含该条目
   */
  test('register() 注册快捷键后 registry 包含该条目', () => {
    const registry = new ShortcutRegistry();
    const handler = () => {};

    registry.register({ key: 'ctrl+s', handler, priority: 10 });

    const entries = registry.getEntries('ctrl+s');
    expect(entries).toHaveLength(1);
    expect(entries[0].handler).toBe(handler);
    expect(entries[0].priority).toBe(10);
  });

  /**
   * 测试 match() 匹配最高优先级
   * 注册两个相同 key 但不同 priority 的 handler，
   * match() 应返回 priority 更高的那个
   */
  test('match() 返回优先级最高的 handler', () => {
    const registry = new ShortcutRegistry();
    const lowHandler = () => 'low';
    const highHandler = () => 'high';

    registry.register({ key: 'ctrl+s', handler: lowHandler, priority: 10 });
    registry.register({ key: 'ctrl+s', handler: highHandler, priority: 20 });

    const matched = registry.match('ctrl+s');
    expect(matched).not.toBeNull();
    expect(matched!.handler).toBe(highHandler);
    expect(matched!.priority).toBe(20);
  });

  /**
   * 测试 scope 不冲突
   * 相同 key 在不同 scope（如 'global' vs 'editor'）下注册，
   * 不应互相干扰，各自独立存在
   */
  test('相同 key 在不同 scope 下不冲突', () => {
    const registry = new ShortcutRegistry();
    const globalHandler = () => 'global';
    const editorHandler = () => 'editor';

    registry.register({ key: 'ctrl+s', handler: globalHandler, priority: 10, scope: 'global' });
    registry.register({ key: 'ctrl+s', handler: editorHandler, priority: 10, scope: 'editor' });

    const globalEntries = registry.getEntries('ctrl+s', 'global');
    const editorEntries = registry.getEntries('ctrl+s', 'editor');

    expect(globalEntries).toHaveLength(1);
    expect(globalEntries[0].handler).toBe(globalHandler);

    expect(editorEntries).toHaveLength(1);
    expect(editorEntries[0].handler).toBe(editorHandler);
  });
});
