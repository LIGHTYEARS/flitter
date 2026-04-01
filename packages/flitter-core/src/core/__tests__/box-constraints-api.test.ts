// BoxConstraints API 补全测试
// 覆盖: normalize(), tighten(), isNormalized（负值检查）, constrainWidth(), constrainHeight()
// 预期: 全部 FAIL —— 因为这些方法/行为尚未在 BoxConstraints 中实现

import { describe, expect, it } from 'bun:test';
import { BoxConstraints } from '../box-constraints';

describe('BoxConstraints API 补全', () => {
  // ============================================================
  // normalize()
  // Flutter 行为: normalize 保证 min 不变, max = Math.max(min, max)
  // 即当 min > max 时，将 max 提升到 min 的值
  // ============================================================
  describe('normalize()', () => {
    it('当 minWidth > maxWidth 时，maxWidth 应被提升到 minWidth', () => {
      const c = new BoxConstraints({ minWidth: 200, maxWidth: 100 });
      const normalized = c.normalize();
      expect(normalized.minWidth).toBe(200);
      expect(normalized.maxWidth).toBe(200);
    });

    it('当 minHeight > maxHeight 时，maxHeight 应被提升到 minHeight', () => {
      const c = new BoxConstraints({ minHeight: 300, maxHeight: 50 });
      const normalized = c.normalize();
      expect(normalized.minHeight).toBe(300);
      expect(normalized.maxHeight).toBe(300);
    });

    it('已 normalized 的约束调用 normalize() 后值不变', () => {
      const c = new BoxConstraints({ minWidth: 10, maxWidth: 100, minHeight: 5, maxHeight: 50 });
      const normalized = c.normalize();
      expect(normalized.minWidth).toBe(10);
      expect(normalized.maxWidth).toBe(100);
      expect(normalized.minHeight).toBe(5);
      expect(normalized.maxHeight).toBe(50);
    });

    it('两个轴同时异常时均应修正', () => {
      const c = new BoxConstraints({ minWidth: 200, maxWidth: 100, minHeight: 150, maxHeight: 80 });
      const normalized = c.normalize();
      expect(normalized.minWidth).toBe(200);
      expect(normalized.maxWidth).toBe(200);
      expect(normalized.minHeight).toBe(150);
      expect(normalized.maxHeight).toBe(150);
    });
  });

  // ============================================================
  // tighten()
  // 仅收紧指定轴的约束（将 min 和 max 设为给定值），
  // 未指定的轴保持原值不变
  // ============================================================
  describe('tighten()', () => {
    it('仅收紧 width 轴，height 保持不变', () => {
      const c = new BoxConstraints({ minWidth: 0, maxWidth: 200, minHeight: 0, maxHeight: 100 });
      const tightened = c.tighten({ width: 50 });
      expect(tightened.minWidth).toBe(50);
      expect(tightened.maxWidth).toBe(50);
      // height 不变
      expect(tightened.minHeight).toBe(0);
      expect(tightened.maxHeight).toBe(100);
    });

    it('仅收紧 height 轴，width 保持不变', () => {
      const c = new BoxConstraints({ minWidth: 10, maxWidth: 200, minHeight: 0, maxHeight: 100 });
      const tightened = c.tighten({ height: 30 });
      // width 不变
      expect(tightened.minWidth).toBe(10);
      expect(tightened.maxWidth).toBe(200);
      expect(tightened.minHeight).toBe(30);
      expect(tightened.maxHeight).toBe(30);
    });

    it('同时收紧两个轴', () => {
      const c = new BoxConstraints({ minWidth: 0, maxWidth: 200, minHeight: 0, maxHeight: 100 });
      const tightened = c.tighten({ width: 80, height: 24 });
      expect(tightened.minWidth).toBe(80);
      expect(tightened.maxWidth).toBe(80);
      expect(tightened.minHeight).toBe(24);
      expect(tightened.maxHeight).toBe(24);
      expect(tightened.isTight).toBe(true);
    });
  });

  // ============================================================
  // isNormalized（负值检查）
  // Flutter 中 isNormalized 要求所有四个值 >= 0，且 min <= max
  // 当前实现只检查 min <= max，缺少 >= 0 检查
  // ============================================================
  describe('isNormalized 负值检查', () => {
    it('minWidth 为负值时不算 normalized', () => {
      // 绕过构造函数的 roundOrInf 直接构造负值约束
      // 使用 Object.create 模拟负值场景
      const c = new BoxConstraints({ minWidth: -10, maxWidth: 100 });
      expect(c.isNormalized).toBe(false);
    });

    it('minHeight 为负值时不算 normalized', () => {
      const c = new BoxConstraints({ minHeight: -5, maxHeight: 50 });
      expect(c.isNormalized).toBe(false);
    });

    it('所有值为非负且 min <= max 时才算 normalized', () => {
      const c = new BoxConstraints({ minWidth: 0, maxWidth: 100, minHeight: 0, maxHeight: 50 });
      expect(c.isNormalized).toBe(true);
    });
  });

  // ============================================================
  // constrainWidth(w)
  // 将给定宽度值 clamp 到 [minWidth, maxWidth] 范围
  // ============================================================
  describe('constrainWidth()', () => {
    it('值在范围内时原样返回', () => {
      const c = new BoxConstraints({ minWidth: 10, maxWidth: 100 });
      expect(c.constrainWidth(50)).toBe(50);
    });

    it('值小于 minWidth 时返回 minWidth', () => {
      const c = new BoxConstraints({ minWidth: 10, maxWidth: 100 });
      expect(c.constrainWidth(5)).toBe(10);
    });

    it('值大于 maxWidth 时返回 maxWidth', () => {
      const c = new BoxConstraints({ minWidth: 10, maxWidth: 100 });
      expect(c.constrainWidth(200)).toBe(100);
    });

    it('无参数时返回 minWidth（Flutter 默认行为: clamp(minWidth, minWidth, maxWidth)）', () => {
      const c = new BoxConstraints({ minWidth: 10, maxWidth: 100 });
      expect(c.constrainWidth()).toBe(10);
    });
  });

  // ============================================================
  // constrainHeight(h)
  // 将给定高度值 clamp 到 [minHeight, maxHeight] 范围
  // ============================================================
  describe('constrainHeight()', () => {
    it('值在范围内时原样返回', () => {
      const c = new BoxConstraints({ minHeight: 5, maxHeight: 50 });
      expect(c.constrainHeight(25)).toBe(25);
    });

    it('值小于 minHeight 时返回 minHeight', () => {
      const c = new BoxConstraints({ minHeight: 5, maxHeight: 50 });
      expect(c.constrainHeight(2)).toBe(5);
    });

    it('值大于 maxHeight 时返回 maxHeight', () => {
      const c = new BoxConstraints({ minHeight: 5, maxHeight: 50 });
      expect(c.constrainHeight(100)).toBe(50);
    });

    it('无参数时返回 minHeight（Flutter 默认行为: clamp(minHeight, minHeight, maxHeight)）', () => {
      const c = new BoxConstraints({ minHeight: 5, maxHeight: 50 });
      expect(c.constrainHeight()).toBe(5);
    });
  });
});
