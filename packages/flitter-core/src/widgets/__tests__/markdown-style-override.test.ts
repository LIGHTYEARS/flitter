// Markdown styleOverrides 功能的 failing tests
// 验证 Markdown 组件支持通过 styleOverrides 参数覆盖各类 block 的默认样式

import { describe, test, expect, beforeEach } from 'bun:test';
import { Markdown } from '../markdown';
import { Text } from '../text';
import { Column } from '../flex';
import { TextStyle } from '../../core/text-style';
import { TextSpan } from '../../core/text-span';

/**
 * 从 Markdown.build() 返回的 Column widget 中提取第一个 Text widget 的 TextSpan。
 * Markdown.build() 返回一个 Column，其 children 是 Text widget 列表。
 */
function extractFirstTextSpan(md: Markdown): TextSpan {
  // build() 需要 context 参数，但对于无 Theme 的测试场景可以传 null（mockContext）
  // Markdown.build 内部通过 Theme.maybeOf(context) 获取主题，maybeOf 返回 undefined 时使用默认值
  const column = md.build(null as any);
  // Column 的 children 是 Widget[]，第一个应该是 Text
  const children = (column as any).children as any[];
  const textWidget = children[0] as InstanceType<typeof Text>;
  return textWidget.text;
}

/**
 * 遍历 TextSpan 树，收集所有叶子节点的 effective style。
 * 返回 { text, style } 数组。
 */
function collectSpanStyles(span: TextSpan): Array<{ text: string; style: TextStyle }> {
  const result: Array<{ text: string; style: TextStyle }> = [];
  span.visitChildren((text, style) => {
    result.push({ text, style });
  });
  return result;
}

describe('Markdown styleOverrides 生效', () => {
  beforeEach(() => {
    Markdown.clearCache();
  });

  // 测试 1: 传入 styleOverrides 后，段落应使用 italic + dim 样式
  test('styleOverrides 中的 paragraph 样式应被应用到段落渲染结果', () => {
    const md = new Markdown({
      markdown: 'Hello world',
      styleOverrides: {
        paragraph: { fontStyle: 'italic', dim: true },
      },
    } as any);

    // 首先验证 styleOverrides 被正确存储为实例属性
    expect((md as any).styleOverrides).toBeDefined();
    expect((md as any).styleOverrides.paragraph.fontStyle).toBe('italic');
    expect((md as any).styleOverrides.paragraph.dim).toBe(true);

    // 渲染并检查生成的 TextSpan 样式
    const span = extractFirstTextSpan(md);
    const segments = collectSpanStyles(span);

    // 段落文本 "Hello world" 应该只有一个 segment
    expect(segments.length).toBeGreaterThanOrEqual(1);
    const paragraphSegment = segments[0]!;
    expect(paragraphSegment.text).toBe('Hello world');

    // 核心断言: styleOverrides 中指定的 italic 和 dim 应被应用
    expect(paragraphSegment.style.italic).toBe(true);
    expect(paragraphSegment.style.dim).toBe(true);
  });

  // 测试 2: 不传 styleOverrides 时，段落保持默认样式（无 italic、无 dim）
  test('不传 styleOverrides 时段落保持默认样式', () => {
    const md = new Markdown({
      markdown: 'Default paragraph',
    });

    // 验证 styleOverrides 属性存在但为 undefined（即 Markdown 类定义了该属性）
    expect(md).toHaveProperty('styleOverrides');
    expect((md as any).styleOverrides).toBeUndefined();

    // 渲染并检查默认段落样式
    const span = extractFirstTextSpan(md);
    const segments = collectSpanStyles(span);

    expect(segments.length).toBeGreaterThanOrEqual(1);
    const paragraphSegment = segments[0]!;
    expect(paragraphSegment.text).toBe('Default paragraph');

    // 默认样式不应有 italic 和 dim
    expect(paragraphSegment.style.italic).toBeUndefined();
    expect(paragraphSegment.style.dim).toBeUndefined();
  });
});
