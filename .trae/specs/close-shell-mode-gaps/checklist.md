# Checklist — Close Shell Mode Gaps

## G1: 75ms pending→shown 延时
- [x] `invokeBashCommand` 创建 invocation 后先放入 `pendingBashInvocations` Map 而非直接加入 `bashInvocations[]`
- [x] 75ms `setTimeout` 回调中才将 invocation 从 pending 转移到 `bashInvocations[]`
- [x] `pendingBashInvocations` 的 Map value 类型为 `{ invocation: BashInvocation; showTimer: ReturnType<typeof setTimeout> }`

## G2: 500ms 最小显示时间
- [x] `removeBashInvocation` 检查 pending 状态 — 如果 invocation 在 pending 中，清除 showTimer 并从 pending 删除
- [x] `removeBashInvocation` 检查 `bashInvocationShownAt` — 显示不足 500ms 时设置延迟定时器
- [x] 延迟定时器回调调用 `doRemoveBashInvocation(id)` 完成实际移除
- [x] `doRemoveBashInvocation` 从 `bashInvocationShownAt`、`bashInvocations`、`bashInvocationRemoveTimers` 中清理

## G3: AbortController 存储与传递
- [x] `BashInvocation` interface 包含 `abortController: AbortController` 字段
- [x] `invokeBashCommand` 中创建的 AbortController 存储在 invocation 中
- [x] AbortController 的 `signal` 被传递给 `BashExecutor.execute()` 调用

## G4: Double-Escape 取消
- [x] `cancelBashInvocations()` 方法存在：清除 pending timers、abort pending invocations、清除 remove timers、abort running invocations
- [x] `isConfirmingCancelProcessing` 状态字段存在
- [x] AppShell Escape handler 中：`bashInvocations.length > 0 || isProcessing` 时进入确认模式
- [x] AppShell Escape handler 中：确认模式下再次 Esc 调用 `cancelBashInvocations()`
- [x] 1 秒超时后自动退出确认模式

## G5: hidden visibility 过滤
- [x] `BashInvocation` interface 包含 `hidden: boolean` 字段
- [x] `invokeBashCommand` 中 `visibility === 'hidden'` 时设置 `hidden: true`
- [x] `BashInvocationsWidget.build()` 跳过 `hidden === true` 的 invocations
- [x] `isRunningShell` getter 仍然包含 hidden invocations

## G6: Footer status 感知
- [x] `getFooterText` 在 `runningBashInvocations: true` 时返回 "Running shell command..."
- [x] `StatusBarProps` 包含 `runningBashInvocations` 字段
- [x] AppShell 向 StatusBar 传递 `runningBashInvocations` prop

## G7: Esc hint 感知
- [x] `buildBottomLeftOverlay` 接受 `isRunningBashInvocations` 参数
- [x] `buildBottomLeftOverlay` 接受 `isConfirmingCancelProcessing` 参数
- [x] `isConfirmingCancelProcessing` 为 true 时显示 "Esc again to cancel"
- [x] `isRunningBashInvocations` 为 true 且非 streaming 时显示 "Esc to cancel"

## 编译
- [x] `npx tsc --noEmit` 在 `packages/flitter-cli` 下无新增错误
