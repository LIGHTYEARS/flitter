---
name: compaction-execution
category: state-machine
priority: P0
timeout: 45s
requires: [test-harness, mock-provider]
fixture:
  session: compaction-session
  stream: simple-stream
tags: [compaction, F3]
linked-plans: [39-02]
generated-by: 39-02
---

# Compaction 裁剪执行验证

## 背景
当 context window 接近容量上限时，PromptController 通过调用
SessionState.truncateBefore() 裁剪早期对话项，释放 context 空间。
本测试验证裁剪行为的正确性和安全性。

## Step 1: 构建高压 session
- 使用 createTestAppState() 创建 TestHarness
- 向 session 中注入 50 轮对话（100 items: 50 user + 50 assistant）
- 可通过 `session.startProcessing(msg)` + `session.beginStreaming()` + `session.completeStream('end_turn')` + `session.reset()` 循环构建
- **检查**: session.items.length >= 100

## Step 2: truncateBefore 基本行为
- 调用 `session.truncateBefore(50)`（裁剪前 50 个 items）
- **检查**: session.items.length 应在 50 左右（原长度减去裁剪的数量）
- **检查**: session.version 在裁剪后递增

## Step 3: 裁剪后的 items 完整性
- 检查裁剪后剩余的 items
- **检查**: 剩余 items 中第一条应是原来 index=50 位置的 item
- **检查**: 最后一条 item 应与裁剪前的最后一条相同

## Step 4: 边界保护
- 测试 truncateBefore(0)（不应裁剪）
- 测试 truncateBefore(-1)（不应裁剪）
- 测试 truncateBefore(9999)（超出范围，不应裁剪）
- **检查**: 以上三种情况 session.items.length 均不变

## Step 5: 非 idle 状态保护
- 调用 session.startProcessing("test") 使 session 进入 processing 状态
- 调用 truncateBefore(10)
- **检查**: session.items.length 不变（非 idle 状态不允许裁剪）

## 预期结果
- truncateBefore 正确裁剪指定位置之前的 items
- 裁剪后版本号递增
- 边界条件（0、负数、超出范围）全部被安全拒绝
- 非 idle 状态下裁剪被正确阻止
