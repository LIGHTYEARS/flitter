---
name: thread-worker-lifecycle
category: state-machine
priority: P0
timeout: 30s
requires: [test-harness]
tags: [thread-worker, F1, F35]
linked-plans: [39-01]
generated-by: 39-01
---

# ThreadWorker 完整生命周期

## 背景
ThreadWorker 是事件驱动状态机，处理 9 种 delta 事件类型。
本测试验证一个完整 turn 的状态转换链路：idle → running → tool_running → running → idle。

## Step 1: 初始状态验证
- 从 `packages/flitter-cli/src/state/thread-worker.ts` 导入 ThreadWorker
- 创建一个新的 ThreadWorker 实例
- **检查**: state 应为 `idle`
- **检查**: inferenceState 应为 `none`
- **检查**: inferenceController 应为 null
- **检查**: isIdle 应为 true
- **检查**: isRunning 应为 false

## Step 2: 触发推理（dequeue）
- 发送 `user:message-queue:dequeue` 事件
- **检查**: state 转为 `running`
- **检查**: inferenceState 转为 `streaming`
- **检查**: inferenceController 不为 null（AbortController 已创建）
- **检查**: turnStartTime 是一个合理的时间戳（与 Date.now() 差值 < 5000ms）

## Step 3: 工具调用
- 发送 `tool:data` 事件，payload 为 `{ name: "bash", input: "ls" }`
- **检查**: state 转为 `tool_running`
- **检查**: inferenceState 转为 `tool_call`
- **检查**: toolCallUpdates 数组长度为 1

## Step 4: 恢复流式
- 发送 `assistant:message` 事件
- **检查**: inferenceState 回到 `streaming`
- **检查**: state 仍为 `running`（非 tool_running）

## Step 5: 完成推理
- 发送 `inference:completed` 事件
- **检查**: state 回到 `idle`
- **检查**: inferenceState 回到 `none`
- **检查**: inferenceController 回到 null
- **检查**: toolCallUpdates 数组已清空
- **检查**: turnStartTime 回到 null

## 预期结果
- 完整经历 idle → running → tool_running → running → idle 状态链
- 每一步的状态转换都正确
- AbortController 在推理完成后被正确清理
