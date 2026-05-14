# Flitter vs Amp CLI Feature Gaps

> 审计时间: 2026-05-14 | 审计方法: 子代理并行搜索 amp-cli-reversed/ 全部 chunk 文件 + 500+ 模块

本文档记录 Flitter 与 Amp CLI 的功能差距，作为优先级排序和迭代规划的依据。

---

## P0/P1 差距 (Critical / High)

### @flitter/util

- [ ] GAP-001 Reactive 操作符缺失: switchMap, mergeMap, concatMap, takeUntil, combineLatest, debounceTime, share, shareReplay, catchError (Amp 使用 RxJS 完整操作符集，Flitter 仅 4 个基础操作符 map/filter/distinctUntilChanged/throttleTime)
- [ ] GAP-002 OpenTelemetry 遥测完全空白 (Amp chunk-005 含 TracerProvider + BatchSpanProcessor + OTLPExporter + Metrics ~8000 行，Flitter 零实现)
- [ ] GAP-003 IDE Bridge WebSocket 传输层缺失 (Amp chunk-003:10979-11107 含双向 WebSocket proxy + 20+ 消息类型，Flitter 仅 HTTP REST DTW 客户端)

### @flitter/agent-core

- [ ] GAP-004 ThreadWorker ephemeralError 响应式流缺失 (Amp ov.js:96 使用 BehaviorSubject + status Observable 合并，Flitter 仅事件发射)
- [ ] GAP-005 resume 时 snapshotOIDs 自动恢复缺失 (Amp ov.js:357,408 存储 snapshotOIDs 并在 resume 时调用 restoreToSnapshot)
- [ ] GAP-006 BASE_ROLE_PROMPT 内容覆盖不足 (Amp chunk-005:18594-18736 含详尽并行策略示例 + 6 个工作流场景，Flitter 过于精简)
- [ ] GAP-007 DTW ThreadPool 池化管理缺失 (Amp chunk-005:5186 createDTWThreadPool + 线程切换/列表，Flitter 仅基础 DTW Client)
- [ ] GAP-008 消息队列/插队机制缺失 (Amp queuedInterject + interruptQueuedMessage，DTW 模式下用户可在 agent 运行时队列新消息)
- [ ] GAP-009 Thread Actors 多线程协作模式缺失 (Amp --thread-actors flag + actors 模式判断)

### @flitter/data

- [ ] GAP-010 Thread live-sync / DTW 双向同步缺失 (Amp chunk-005:4824 amp live-sync + DTW UI 代码，Flitter 仅单向 upload)
- [ ] GAP-011 Thread remote async execution 缺失 (Amp chunk-005:5141 --remote 标志 + r40() 远程执行)
- [ ] GAP-012 Guidance subtree 动态发现缺失 (Amp chunk-001:14425-14441 工具操作子目录时自动发现 AGENTS.md 并标记 type:subtree)
- [ ] GAP-013 Skill 文件大小/数量安全限制缺失 (Amp chunk-002:28183-28187 jqR() 三重验证: 文件数上限 + 单文件大小 + 总大小，Flitter 无任何限制 — 安全缺陷)
- [ ] GAP-014 Anthropic server-side compaction 协议缺失 (Amp chunk-005:87815-87868 compactionControl 参数 + compaction_delta 事件，Flitter 仅客户端侧 compaction)

### @flitter/cli

- [ ] GAP-015 OAuth PKCE 完整流程未确认 (Amp M5T.js:271 codeVerifier + code_challenge_method，需验证 @flitter/llm 是否完整实现并在 CLI 层集成)
- [ ] GAP-016 Token 自动刷新缺失 (Amp OAuth2Client 含 refresh_token 自动续期，Flitter 未发现 refresh 逻辑，长时间会话可能中断)

### @flitter/tui

- [ ] GAP-017 ListView 虚拟化不完整 (Amp actions_intents.js:1734-1778 含 itemKeyBuilder/estimatedItemExtentBuilder/scrollToIndex/keptAlive/enableSelection，Flitter 基础实现缺 key 稳定性/保活/scrollToIndex/选区)
- [ ] GAP-018 SelectionArea 文本选区不完整 (Amp actions_intents.js:206-579 含三种选区模式 character/word/line + 全局鼠标捕获 + 自动滚动 + 剪贴板集成)

---

## P2 差距 (Medium)

### @flitter/util

- [ ] GAP-019 NDJSON/LineDecoder 流工具未提升到共享层 (MCP 包有 read-buffer.ts 但未提升到 util 供复用)
- [ ] GAP-020 JSON Schema ↔ Zod 转换工具缺失 (Amp chunk-005:72790 使用 zodToJsonSchema 库)
- [ ] GAP-021 FuzzyServer 有状态架构缺失 (Amp chunk-003:15580-15667 含 ready/initializing 状态 + 后台 dirty file/commit 刷新)
- [ ] GAP-022 Git live-sync 队列 + coalescing 缺失 (Amp chunk-003:16766-16992 gitStatusQueue 去重排队)
- [ ] GAP-023 Observable 错误边界操作符缺失 (retry/retryWhen/catchError)

### @flitter/llm

- [ ] GAP-024 Thinking budget 动态计算缺失 (Amp chunk-002:2138 jwT() 函数根据上下文动态计算，Flitter 使用固定 maxOutputTokens)
- [ ] GAP-025 eager_input_streaming: true 未设置 (Amp chunk-002:2236 在 Anthropic tool 定义中设置)
- [ ] GAP-026 Secret Redaction 系统缺失 (Amp chunk-005:119089-119180 pino redact + gaxios header 脱敏)
- [ ] GAP-027 Fireworks 完整消息转换缺失 (Amp chunk-002:14604-14865 专用转换器含空 block 过滤 + leaked token 检测)
- [ ] GAP-028 Model Registry 模型数量待对齐 (Amp chunk-005:66584-67160 含 ~40+ 模型定价/能力)

### @flitter/agent-core

- [ ] GAP-029 turnElapsedMs 实时计时缺失 (Amp ov.js:221 _turnElapsedMs 合入 status Observable)
- [ ] GAP-030 Handoff 完整状态机缺失 (Amp ov.js:1291-1333 含 countdown timer + abort confirmation + generating spinner)
- [ ] GAP-031 用户自定义 --system-prompt 缺失 (Amp chunk-006:38272-38278)
- [ ] GAP-032 Model Pricing Table 数量不足 (Flitter 8 模型 vs Amp 20+)
- [ ] GAP-033 skipTitleGeneration 配置缺失 (Amp ov.js:756 skipTitleGenerationIfMessageContains)
- [ ] GAP-034 Compaction 阈值可配置缺失 (Amp chunk-005:155677 internal.compactionThresholdPercent)

### @flitter/data

- [ ] GAP-035 Config 三层 key 分类不完整 (Amp chunk-005:67338 四类: cCT/sCT/bL/oCT，Flitter 缺 bL 不可远程设置 + oCT 密钥字段)
- [ ] GAP-036 Thread compaction transport 事件协议缺失 (Amp chunk-005:157020-157840 三种事件: compaction_started/complete/records)
- [ ] GAP-037 Thread git status 快照队列缺失 (Amp chunk-003:16766-16976 gitStatusQueue + sendGitStatusSnapshot)
- [ ] GAP-038 Guidance 32KB 全局 budget 缺失 (Amp chunk-002:20380-20396 全局累加截断，Flitter 仅单文件截断)
- [ ] GAP-039 YAML 解析使用手写替代真 YAML 库 (Amp chunk-002:28085 yaml.parse()，Flitter parseSimpleYaml 不支持多行字符串/锚点/flow mapping)
- [ ] GAP-040 Skill frontmatter 未知字段检测缺失 (Amp chunk-001:14629 报错未知字段 + 重复字段检测)
- [ ] GAP-041 MCP mcpPermissions 细粒度权限缺失 (Amp chunk-001:13245-13557 per-server tool 级 allow/deny)
- [ ] GAP-042 MCP OAuth 令牌管理缺失 (Amp oCT 含 mcp-oauth-client-secret/mcp-oauth-token)

### @flitter/cli

- [ ] GAP-043 thread-map 命令缺失 (Amp e0R.js:246 显示 thread 关系图)
- [ ] GAP-044 switch-cluster 命令缺失 (Amp e0R.js:260 切换 thread cluster)
- [ ] GAP-045 fork 命令缺失 (Amp e0R.js:469 fork 当前 thread)
- [ ] GAP-046 share-support 命令缺失 (Amp e0R.js:590 分享 thread 给 support)
- [ ] GAP-047 copy-selection 命令缺失 (Amp e0R.js:929 复制 TUI 选中文本)
- [ ] GAP-048 paste-image 命令缺失 (Amp e0R.js:948 从剪贴板粘贴图片)
- [ ] GAP-049 Keyring 原生集成降级 (Amp 使用 @napi-rs/keyring OS 原生密钥链，Flitter 使用文件存储)

### @flitter/tui

- [ ] GAP-050 Color Palette Change Notification 缺失 (Amp modules/2112:291-294 DECRPM ?2031 检测 + handleColorPaletteChangeNotification)
- [ ] GAP-051 通用 LayoutBuilder Widget 缺失 (Amp 通过 Scrollable viewportBuilder 实现类似功能但未通用化)

---

## Flitter 超前于 Amp 的功能

| 功能 | 说明 |
|------|------|
| AWS Bedrock Provider | Flitter 有独立 bedrock/ 实现，amp 无 |
| DeepSeek Provider | openai-compat 预配置 |
| Unicode Sanitize | sanitizeSurrogates() |
| Memory Store | key-value 持久化 (amp 无独立 memory) |
| Theme Hot-reload | 主题热更新 |
| File Secret Storage | 文件级凭据存储 (amp 依赖 OS keyring) |

---

## 覆盖度统计

| 包 | 覆盖度 | P0-P1 差距 |
|----|--------|-----------|
| @flitter/util | ~70% | 3 |
| @flitter/schemas | ~90% | 0 |
| @flitter/tui | ~90% | 2 |
| @flitter/llm | ~90% | 0 |
| @flitter/agent-core | ~85% | 6 |
| @flitter/data | ~80% | 5 |
| @flitter/cli | ~85% | 2 |
| **整体** | **~85%** | **18** |

---

## ROADMAP 覆盖分析

现有 ROADMAP (Phase 13-19) 覆盖约 60% 的 P1 差距。以下差距未被规划：

| 优先级 | 未覆盖差距 | 建议 |
|--------|-----------|------|
| P0 | GAP-001 Reactive 操作符 | Phase 2 补丁 (util) |
| P1 | GAP-002 OTel 遥测 | 新 Phase (util) |
| P1 | GAP-003 IDE Bridge WebSocket | 新 Phase (util) |
| P1 | GAP-008 消息队列/插队 | 新 Phase (agent-core) |
| P1 | GAP-009 Thread Actors | 新 Phase (agent-core) |
| P1 | GAP-016 Token refresh | Phase 18 扩展 |
