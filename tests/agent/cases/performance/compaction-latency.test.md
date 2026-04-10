---
name: compaction-latency
category: performance
priority: P1
timeout: 120s
requires: [test-harness]
tags: [compaction, F3, perf]
linked-plans: [39-02]
generated-by: 39-02
---

# Compaction 裁剪延迟性能测试

## 背景
当 session 包含大量对话项时，truncateBefore 的执行耗时必须保持可控，
不能因为数据量增加而出现明显卡顿。

## Step 1: 构建大型 session
- 创建 TestHarness
- 向 session 注入 200 轮对话（约 400 items）
- **检查**: session.items.length >= 400

## Step 2: 测量裁剪延迟
- 使用 performance.now() 记录起始时间
- 调用 truncateBefore(200)
- 记录结束时间
- **检查**: 耗时 < 200ms
- **检查**: session.items.length 约为 200

## Step 3: 多次裁剪稳定性
- 重新注入 items 恢复到 400
- 连续执行 5 次裁剪（每次裁剪 40 items）
- 记录每次耗时
- **检查**: 所有 5 次耗时均 < 100ms
- **检查**: 最终 session.items.length 约为 200

## Step 4: 内存占用检查
- 执行 Bun.gc(true) 触发垃圾回收
- 记录 process.memoryUsage().heapUsed
- **检查**: heapUsed < 200MB（合理范围内）

## 预期结果
- 400 items 的裁剪在 200ms 内完成
- 重复裁剪性能稳定
- 无显著内存泄漏
