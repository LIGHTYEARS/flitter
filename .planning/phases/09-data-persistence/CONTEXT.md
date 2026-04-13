# Phase 9: 数据持久化层 — Context

**Package:** `@flitter/data`
**Effort:** M | **Risk:** Low-Medium
**Requirements:** DATA-01, DATA-02, DATA-03, DATA-04, DATA-05

---

## 逆向模块映射

| 目标模块 | 逆向源文件 | 关键符号 |
|----------|-----------|---------|
| ThreadStore | skills-agents-system.js:3309-3393 | azT (ThreadStore class), fuT (thread→entry), T4 (deep equality), f0 (BehaviorSubject) |
| ThreadEntry | skills-agents-system.js:3281-3308 | fuT→ThreadEntry 构造, HqR→userLastInteractedAt, WqR→usesDtw, FqR→meta |
| ConfigService | util/otel-instrumentation.js:1782-1880 | LX (factory), storage.get/set/delete, secretStorage, reactive config stream |
| Settings Storage | app/process-runner.js:695-750 | settings.json/settings.jsonc fallback, workspace root walk, .amp/settings.json |
| SkillService | skills-agents-system.js:2906-3244 | UqR (factory), OqR (load skill), SqR (parse SKILL.md), muT (detect), uuT (scan dir) |
| Skill Install/Remove | skills-agents-system.js:2588-2674 | J5T (install), TzT (remove), bqR/yqR (list) |
| Guidance Files | mcp-tools-integration.js:690-1200 | fm (discovery), IkR (format), ZA (path display), lkR (glob filter) |
| Context/Compaction | realtime-sync.js:1349-1730, llm-sdk-providers.js:1318 | compaction_started/complete events, DTW-driven compaction |

---

## 依赖关系

```
@flitter/schemas  →  ThreadSnapshotSchema, SettingsSchema, ConfigService interface
                     GuidanceFileRefSchema, PermissionEntrySchema
@flitter/util     →  BehaviorSubject/Subscription (reactive/), logger, error, scanner
```

`@flitter/data` 不依赖 `@flitter/llm` 或 `@flitter/tui` — 纯数据层。

---

## 关键设计决策

### KD-25: 本地文件存储 (非 DTW)
Flitter v1 只实现本地 JSON 文件持久化，不实现 DTW (Durable Thread Worker) 远程同步。
DTW 是 Amp 的 SaaS 特性，Flitter 作为本地工具不需要。

### KD-26: 配置路径映射 (Amp→Flitter)
| Amp 路径 | Flitter 路径 |
|---------|-------------|
| `~/.config/amp/settings.json` | `~/.config/flitter/settings.json` |
| `.amp/settings.json` | `.flitter/settings.json` |
| `.agents/skills/` | `.flitter/skills/` (workspace) |
| `~/.config/amp/skills/` | `~/.config/flitter/skills/` (global) |

### KD-27: JSONC 支持
ConfigService 使用自实现的 JSONC stripper (去除 // 和 /* */ 注释)，不引入外部依赖。
回写时保持纯 JSON (不写注释)。

### KD-28: 原子写入
文件写入使用 write-to-temp + rename 模式确保原子性，防止断电丢失。

### KD-29: Context Manager 本地实现
Amp 的 compaction 由 DTW 服务端驱动。Flitter 在本地实现：
- 使用 LLM 调用生成摘要 (summary content block)
- Token 计数使用近似算法 (chars/4 for English, chars/2 for CJK)
- 阈值触发：当 token 数超过 context window 的 compactionThresholdPercent (默认 80%)

### KD-30: SkillService 发现路径 (Flitter 版)
1. 项目级: `.flitter/skills/`
2. 全局级: `~/.config/flitter/skills/`
3. 内置级: `builtin://` (由 agent-core 注入)

### KD-31: Guidance 文件规范
- 文件名: `AGENTS.md` (项目级指导) 或 `CLAUDE.md` (别名)
- 搜索路径: 从 cwd 向上遍历到 workspace root
- 预算: 单文件最大 32768 字节
- 支持 YAML 前置声明 (可选 globs 过滤)

---

## 波次划分

| Wave | Plans | 并行策略 | 依赖 |
|------|-------|---------|------|
| Wave 1 | 09-01 (ThreadStore) + 09-02 (Thread JSON 持久化) | 串行 (02 依赖 01) | 无外部依赖 |
| Wave 2 | 09-03 (ConfigService) + 09-04 (ConfigService 热重载) | 并行 | 无 |
| Wave 3 | 09-05 (SkillService) + 09-06 (Guidance Files) | 并行 | 无 |
| Wave 4 | 09-07 (Context Manager) | 单独 | 无 |

Wave 1 内部 09-01 和 09-02 紧耦合 (ThreadStore CRUD + 文件持久化)，合并为一个 wave 顺序执行。
Wave 2-3 可与前序 wave 串行（Wave 2 不依赖 Wave 1，但为控制复杂度按序执行）。

---

## 测试策略

- 框架: `node:test` + `node:assert/strict` (与项目现有模式一致)
- 文件位置: co-located `*.test.ts`
- 文件系统: 使用真实 tmp 目录 (`fs.mkdtempSync`)，每个测试前创建、后清理
- 不使用 mock 文件系统 — 数据层的核心就是文件 I/O，用真实文件测试更有意义
- 异步测试: `async it()` + `await`

---

## 文件结构预览

```
packages/data/src/
├── thread/
│   ├── types.ts              # ThreadEntry, ThreadStoreOptions, etc.
│   ├── thread-store.ts       # ThreadStore class (in-memory CRUD + dirty tracking)
│   ├── thread-store.test.ts
│   ├── thread-persistence.ts # JSON file I/O (atomic write, list, load, delete)
│   └── thread-persistence.test.ts
├── config/
│   ├── jsonc.ts              # JSONC stripper (strip comments)
│   ├── settings-storage.ts   # FileSettingsStorage (read/write settings.json)
│   ├── config-service.ts     # ConfigService (3-tier merge + reactive)
│   ├── config-service.test.ts
│   └── jsonc.test.ts
├── skill/
│   ├── skill-types.ts        # Skill, SkillFrontmatter, etc.
│   ├── skill-parser.ts       # SKILL.md frontmatter + body parser
│   ├── skill-service.ts      # SkillService (discovery + watch + install/remove)
│   └── skill-service.test.ts
├── guidance/
│   ├── guidance-loader.ts    # Guidance file discovery + loading + budget
│   └── guidance-loader.test.ts
├── context/
│   ├── token-counter.ts      # Approximate token counting
│   ├── context-manager.ts    # Compaction manager (summarize + trim)
│   └── context-manager.test.ts
└── index.ts                  # Barrel export
```
