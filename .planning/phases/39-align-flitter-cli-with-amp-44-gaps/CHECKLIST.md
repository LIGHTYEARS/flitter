# Checklist — flitter-cli vs AMP 44 项功能对齐

## Wave 1: P0-CRITICAL
- [ ] `?` 在空输入框触发 shortcuts help toggle（F4）
- [ ] `/` 在空输入框触发 command palette + toast（F5）
- [ ] Ctrl+O 打开 command palette 无 RenderFlex overflow（F6）
- [ ] ThreadWorker 是完整事件驱动状态机，处理 ≥6 种 delta 事件（F1）
- [ ] ThreadWorker 支持 ops/AbortController 取消操作（F1）
- [ ] Queue auto-dequeue: turn 完成后自动 dequeue 下一条（F2）
- [ ] Compaction 实际裁剪: 超阈值时移除早期消息（F3）
- [ ] `isAutoCompacting` 为动态值而非硬编码 false（F3）
- [ ] `tests/state/thread-worker.test.ts` 通过
- [ ] `tests/state/queue-auto-dequeue.test.ts` 通过
- [ ] `tests/state/compaction-execution.test.ts` 通过

## Wave 2: P1-HIGH
- [ ] Thread relationships 支持 fork/handoff/mention 三种类型（F7）
- [ ] ThreadStatus 支持 merging/merged 状态（F7）
- [ ] createThread 为 async，支持 seededMessages/parent/draft/queue 转移（F9）
- [ ] Thread preview split-view 在 hover 时显示内容预览（F8）
- [ ] Queue UI 组件显示排队消息列表，支持单条中断（F10）
- [ ] Confirmation overlay 支持多选项 permission dialog（F11）
- [ ] ToastController show/dismiss API 完整，auto-dismiss 3s（F12）
- [ ] Up 箭头编辑上一条用户消息，截断后续项（F13）
- [ ] Pending skills 在推理前注入为 info message（F14）
- [ ] Agent mode per-thread 持久化，切换线程恢复 mode（F15）
- [ ] generateTitle 支持 AbortController 取消 + skip 规则（F16）
- [ ] HandoffService 独立抽取，支持系统提示构建（F17）
- [ ] followHandoffIfSourceActive 回调实现（F17）
- [ ] `tests/state/thread-relationships.test.ts` 通过
- [ ] `tests/state/handoff.test.ts` 通过

## Wave 3: P2-MED
- [ ] Provider-specific speed settings (standard/fast)（F18）
- [ ] Interleaved thinking config for Anthropic（F19）
- [ ] Shimmer/falling overlay animation on deep reasoning（F20）
- [ ] Deep mode effort hint controller（F21）
- [ ] Image click → external viewer（F22）
- [ ] Context analyze modal 精确 token 计数（F23）
- [ ] Thread mentions `@@` 触发 thread picker（F24）
- [ ] Model catalog ≥40 models with pricing（F25）
- [ ] Provider config service per-provider settings（F26）
- [ ] Bash invocation running 状态显示 spinner（F27）
- [ ] MCP status modal 显示 server 状态和工具列表（F28）
- [ ] File changes overlay 显示 session-modified files（F29）
- [ ] Bottom grid drag resize（F30）
- [ ] interruptQueuedMessage 单条中断（F31）
- [ ] pendingHandoffThreads 乐观句柄（F32）

## Wave 4: P3-LOW
- [ ] Thread visibility UI command 触发（F33）
- [ ] Thread merging/merged 状态（F34）
- [ ] Worker ephemeralError + retry（F35）
- [ ] Console overlay debug log viewer（F36）
- [ ] News feed reader RSS（F37）
- [ ] JetBrains installer（F38）
- [ ] IDE picker `/ide` command（F39）
- [ ] IDE client background connection（F40）
- [ ] Auto-copy on selection 300ms（F41）
- [ ] Skill preview（F42）
- [ ] Code mode（F43）
- [ ] DTW mode / transport（F44）

## Wave 5: 全量回归
- [ ] `cd packages/flitter-cli && bun test` — 全部通过
- [ ] `cd packages/flitter-cli && bun run typecheck` — 无类型错误
- [ ] `cd packages/flitter-core && bun test` — 无回归
- [ ] `cd packages/flitter-amp && bun test` — 无回归
- [ ] 测试覆盖: thread-pool, handoff, queue-mode, skill-service, config-service, toast-overlay
