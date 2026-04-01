// TextField Emacs 键绑定测试
// 测试 Emacs 风格快捷键：Ctrl+A/E（行首/行尾）、Ctrl+X（剪切）、Ctrl+W（删前词）、Alt+B/F（词移动）
// 预期：全部 FAIL（Emacs 键绑定尚未实现）

import { describe, test, expect, beforeEach } from 'bun:test';
import { TextEditingController, TextField } from '../text-field';
import { createKeyEvent } from '../../input/events';
import type { KeyEvent } from '../../input/events';

// ---------------------------------------------------------------------------
// 辅助函数：创建 TextField state 并模拟挂载
// ---------------------------------------------------------------------------

function createTextFieldState(opts?: Parameters<typeof TextField['prototype']['constructor']>[0]) {
  const tf = new TextField(opts);
  const state = tf.createState() as any;
  state._widget = tf;
  state._mounted = true;
  state.initState();
  return state;
}

/**
 * 构造 KeyEvent 的便捷方法
 */
function keyEvent(key: string, mods?: { ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean; metaKey?: boolean }): KeyEvent {
  return createKeyEvent(key, mods);
}

// ===========================================================================
// Emacs 键绑定测试
// ===========================================================================

describe('TextField Emacs 键绑定', () => {

  // -------------------------------------------------------------------------
  // Ctrl+A → 移动光标到行首（非 selectAll）
  // -------------------------------------------------------------------------
  describe('Ctrl+A → 行首', () => {
    test('单行模式：Ctrl+A 将光标移到行首而非全选', () => {
      const state = createTextFieldState({ maxLines: 1 });
      state.controller.insertText('hello world');
      // 光标在末尾(11)，按 Ctrl+A
      state.handleKeyEvent(keyEvent('a', { ctrlKey: true }));

      // Emacs 行为：光标应移到行首(0)，不应有选区
      expect(state.controller.cursorPosition).toBe(0);
      expect(state.controller.hasSelection).toBe(false);
    });

    test('多行模式：Ctrl+A 将光标移到当前行首', () => {
      const state = createTextFieldState({ maxLines: 5 });
      state.controller.insertText('line1\nline2\nline3');
      // 光标在末尾(17)，即 line3 行尾
      state.handleKeyEvent(keyEvent('a', { ctrlKey: true }));

      // Emacs 行为：光标应移到当前行（line3）的行首，即位置 12
      expect(state.controller.cursorPosition).toBe(12);
      expect(state.controller.hasSelection).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Ctrl+E → 移动光标到行尾
  // -------------------------------------------------------------------------
  describe('Ctrl+E → 行尾', () => {
    test('单行模式：Ctrl+E 将光标移到行尾', () => {
      const state = createTextFieldState({ maxLines: 1 });
      state.controller.insertText('hello world');
      state.controller.cursorPosition = 0;
      state.handleKeyEvent(keyEvent('e', { ctrlKey: true }));

      // Emacs 行为：光标应移到行尾(11)
      expect(state.controller.cursorPosition).toBe(11);
    });

    test('多行模式：Ctrl+E 将光标移到当前行尾', () => {
      const state = createTextFieldState({ maxLines: 5 });
      state.controller.insertText('line1\nline2\nline3');
      state.controller.cursorPosition = 6; // line2 行首
      state.handleKeyEvent(keyEvent('e', { ctrlKey: true }));

      // Emacs 行为：光标应移到当前行（line2）的行尾，即位置 11
      expect(state.controller.cursorPosition).toBe(11);
    });
  });

  // -------------------------------------------------------------------------
  // Ctrl+X → 剪切选区内容
  // -------------------------------------------------------------------------
  describe('Ctrl+X → 剪切', () => {
    test('有选区时剪切选区内容并删除', () => {
      const state = createTextFieldState({ maxLines: 1 });
      state.controller.insertText('hello world');
      state.controller.setSelection(0, 5);

      const result = state.handleKeyEvent(keyEvent('x', { ctrlKey: true }));

      // Emacs 行为：选区内容("hello")被删除，光标在删除位置
      expect(result).toBe('handled');
      expect(state.controller.text).toBe(' world');
      expect(state.controller.cursorPosition).toBe(0);
      expect(state.controller.hasSelection).toBe(false);
    });

    test('无选区时 Ctrl+X 返回 handled 但不修改文本', () => {
      const state = createTextFieldState({ maxLines: 1 });
      state.controller.insertText('hello world');

      const result = state.handleKeyEvent(keyEvent('x', { ctrlKey: true }));

      // 即使无选区，Ctrl+X 也应被识别为 Emacs 键绑定并返回 handled
      expect(result).toBe('handled');
      expect(state.controller.text).toBe('hello world');
    });
  });

  // -------------------------------------------------------------------------
  // Ctrl+W → 删除光标前一个词
  // -------------------------------------------------------------------------
  describe('Ctrl+W → 删前词', () => {
    test('删除光标前的一个词', () => {
      const state = createTextFieldState({ maxLines: 1 });
      state.controller.insertText('hello world');
      // 光标在末尾(11)

      const result = state.handleKeyEvent(keyEvent('w', { ctrlKey: true }));

      // Emacs 行为（unix-word-rubout）：删除光标前一个词 "world"
      expect(result).toBe('handled');
      expect(state.controller.text).toBe('hello ');
      expect(state.controller.cursorPosition).toBe(6);
    });

    test('光标在行首时返回 handled 但不删除', () => {
      const state = createTextFieldState({ maxLines: 1 });
      state.controller.insertText('hello');
      state.controller.cursorPosition = 0;

      const result = state.handleKeyEvent(keyEvent('w', { ctrlKey: true }));

      // 即使光标在行首无法删除，Ctrl+W 也应被识别为 Emacs 键绑定
      expect(result).toBe('handled');
      expect(state.controller.text).toBe('hello');
      expect(state.controller.cursorPosition).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Alt+B → backward-word（光标向前移动一个词边界）
  // -------------------------------------------------------------------------
  describe('Alt+B → backward-word', () => {
    test('光标向前移动一个词边界', () => {
      const state = createTextFieldState({ maxLines: 1 });
      state.controller.insertText('hello world');
      // 光标在末尾(11)

      const result = state.handleKeyEvent(keyEvent('b', { altKey: true }));

      // Emacs 行为：光标移到 "world" 的词首，即位置 6
      expect(result).toBe('handled');
      expect(state.controller.cursorPosition).toBe(6);
      expect(state.controller.hasSelection).toBe(false);
    });

    test('光标在行首时返回 handled 但不移动', () => {
      const state = createTextFieldState({ maxLines: 1 });
      state.controller.insertText('hello');
      state.controller.cursorPosition = 0;

      const result = state.handleKeyEvent(keyEvent('b', { altKey: true }));

      // 即使光标在行首无法移动，Alt+B 也应被识别为 Emacs 键绑定
      expect(result).toBe('handled');
      expect(state.controller.cursorPosition).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Alt+F → forward-word（光标向后移动一个词边界）
  // -------------------------------------------------------------------------
  describe('Alt+F → forward-word', () => {
    test('光标向后移动一个词边界', () => {
      const state = createTextFieldState({ maxLines: 1 });
      state.controller.insertText('hello world');
      state.controller.cursorPosition = 0;

      const result = state.handleKeyEvent(keyEvent('f', { altKey: true }));

      // Emacs 行为：光标移到 "hello" 的词尾，即位置 5
      expect(result).toBe('handled');
      expect(state.controller.cursorPosition).toBe(5);
      expect(state.controller.hasSelection).toBe(false);
    });

    test('光标在末尾时返回 handled 但不移动', () => {
      const state = createTextFieldState({ maxLines: 1 });
      state.controller.insertText('hello');
      // 光标在末尾(5)

      const result = state.handleKeyEvent(keyEvent('f', { altKey: true }));

      // 即使光标在末尾无法移动，Alt+F 也应被识别为 Emacs 键绑定
      expect(result).toBe('handled');
      expect(state.controller.cursorPosition).toBe(5);
    });
  });
});
