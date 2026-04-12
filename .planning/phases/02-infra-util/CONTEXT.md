# Phase 2: 基础设施工具层 — Context

**Phase:** 02-infra-util
**Package:** `@flitter/util`
**Requirements:** INFR-01, INFR-02, INFR-03, INFR-04, INFR-05, INFR-06
**Depends on:** Phase 1 (schemas)

---

## Domain Analysis

Phase 2 建立 Flitter 的运行时基础设施层。`@flitter/util` 是除 schemas 外被最多包依赖的包——`@flitter/data`、`@flitter/agent-core`、`@flitter/llm`、`@flitter/cli` 都直接消费它提供的响应式原语、文件操作、Git 集成和搜索能力。

### 逆向参考代码源

| 领域 | 参考文件 | 关键发现 |
|------|---------|---------|
| Reactive 原语 | `vendor/esm/observable-impl.js` + `module-gs-constructor-y0T.js` + `module-gs-y0t-CnR.js` | Observable/Subject/BehaviorSubject + ObservableSet/ObservableMap + pipe 操作符 |
| URI 解析 | `vendor/esm/uri-impl.js` | RFC 3986 正则 `zdT`，URI 类 (scheme/authority/path/query/fragment)，fsPath getter，编码表 |
| Git 状态检测 | `util/http-request-executor.js` (rVT 函数，~150 行) | rev-parse/status --porcelain=v1/diff，并行获取 HEAD+branch+status，ahead/behind 计算 |
| 文件扫描器 | `util/file-scanner.js` (~340 行) | 外部进程 (rg/fd) + NodeJS 回退扫描，glob 过滤，always-include 路径 |
| Keyring | `app/process-runner.js` (B_0/L_0/M_0 函数) + `util/keyring-native-loader.js` | 文件存储 → 原生 Keychain 迁移，@napi-rs/keyring 加载，advisory lock |
| 模糊搜索 | `util/file-scanner.js` (XKT 类，~100 行) | 语义评分优先 → 模糊回退，smart case，char bag 预过滤，50K 条目上限 |

### 核心架构

```
@flitter/util
├── reactive/           # INFR-01: Observable + Subject + BehaviorSubject + Disposable
│   ├── observable.ts        # Observable 类 (subscribe/pipe/from/of)
│   ├── subject.ts           # Subject + BehaviorSubject (multicast + stateful)
│   ├── disposable.ts        # IDisposable + DisposableCollection
│   ├── observable-set.ts    # ObservableSet (Set + BehaviorSubject)
│   ├── observable-map.ts    # ObservableMap (Map + BehaviorSubject)
│   └── operators.ts         # pipe 操作符 (map/filter/distinctUntilChanged)
├── uri/                # INFR-02: URI 解析
│   └── uri.ts               # URI 类 (RFC 3986 解析/格式化/解析/fsPath)
├── git/                # INFR-03: Git 状态检测
│   └── git.ts               # captureGitStatus() + parseStatus() + getDiff()
├── scanner/            # INFR-04: 文件扫描器
│   └── file-scanner.ts      # FileScanner (外部进程 + NodeJS 回退)
├── keyring/            # INFR-05: Keyring 凭据存储
│   └── keyring.ts           # SecretStore (file-based + native keychain)
├── search/             # INFR-06: 模糊文件搜索
│   └── fuzzy-search.ts      # FuzzyMatcher (语义 + 模糊评分)
├── error.ts            # Plan 07: 通用错误类 + Result 类型
├── logger.ts           # Plan 07: 结构化日志
├── assert.ts           # Plan 07: 断言工具函数
├── process.ts          # Plan 07: 子进程 spawn 封装
└── index.ts            # 统一导出
```

### 技术约束

- **零外部重量级依赖**: Reactive 自实现 (不用 RxJS)，URI 自实现 (不用 url 模块)
- **Disposable 模式**: 所有持有资源的对象实现 `IDisposable` 接口
- **子进程调用**: Git/FileScanner 通过 `child_process.spawn` 执行外部命令
- **平台适配**: Keyring 需 macOS/Linux 分支处理
- **ESM-only**: 所有导出使用 ESM `export` 语法
- **沙箱限制**: bun 不可用，使用 Node.js v24 + npx tsx 运行测试

### 依赖库

| 库 | 用途 |
|----|------|
| `@flitter/schemas` | 类型定义引用 (workspace:*) |
| 无新外部依赖 | Reactive/URI/Git/Scanner/FuzzySearch 全部自实现 |

---

## Plan Overview (3 Waves)

| Wave | Plans | 描述 |
|------|-------|------|
| 1 | 02-01, 02-07 | 核心基础 (Reactive 原语 + 通用工具函数) — 无外部依赖 |
| 2 | 02-02, 02-03, 02-05 | 系统集成 (URI + Git + Keyring) — 依赖 Wave 1 的 Disposable/spawn |
| 3 | 02-04, 02-06 | 搜索系统 (文件扫描器 + 模糊搜索) — 依赖 Wave 2 的 URI + Wave 1 的子进程 |

Wave 1 是纯内部实现，无外部命令调用。Wave 2 引入子进程 (git/keyring)。Wave 3 组合前两层能力。
