# Flitter -- 技术栈研究报告

> 研究日期: 2026-04-12
> 范围: 终端 AI Agent CLI 的 2025 标准技术栈
> 输入: PROJECT.md, amp-cli-reversed/DEPENDENCIES.md, .planning/codebase/STACK.md

---

## 0. 方法论

本报告基于三个信息源交叉验证：
1. **逆向分析** -- `amp-cli-reversed/DEPENDENCIES.md` 中提取的 62 个第三方包（11 个已确认版本）
2. **项目约束** -- `PROJECT.md` 定义的运行时/语言/迁移方式约束
3. **生态现状** -- 2025-2026 年 npm 生态实际发布版本与行业采用趋势

置信度定义：
- **HIGH**: 逆向已确认版本 + 当前生态验证一致
- **MEDIUM**: 逆向识别了包但版本未知，推荐版本基于生态最新稳定版
- **LOW**: 逆向未直接识别，但架构需要，属推荐补充

---

## 1. 运行时与语言

| 维度 | 选择 | 版本 | 置信度 | 理由 |
|------|------|------|--------|------|
| **运行时** | Bun | `>=1.3.0` (当前 1.3.12) | HIGH | PROJECT.md 约束 Bun >= 1.1.0；原版 Amp CLI 使用 Bun 编译；2025-12 Anthropic 收购 Bun 团队并用于 Claude Code，行业信号极强 |
| **语言** | TypeScript | `^5.8.0` (当前 5.8.x) | HIGH | PROJECT.md 约束 TS 5.4+ strict；5.8 为当前稳定线，含改进的 `isolatedDeclarations` 和 `erasableSyntaxOnly` |
| **模块系统** | ESM-only | -- | HIGH | 所有 package.json 已声明 `"type": "module"`；Bun 原生 ESM |
| **编译目标** | ES2022 | -- | HIGH | tsconfig.json 已配置 `"target": "ES2022"` |
| **类型定义** | bun-types | `^1.1.0` | HIGH | 已在 devDependencies 中声明 |

**推荐动作**: 将 `typescript` 从 `^5.4.0` 升级到 `^5.8.0`，将 `bun-types` 从 `^1.1.0` 升级到 `^1.3.0`。

---

## 2. Schema 验证层 (`@flitter/schemas`)

| 包名 | 推荐版本 | 置信度 | 理由 |
|------|----------|--------|------|
| `zod` | `^4.0.0` | HIGH | 逆向确认 4.3.6 (版本对象 `{major:4, minor:3, patch:6}`)；Zod 4 已于 2025-07-08 正式发布到 npm，性能提升 6-14x，bundle 缩小 57%；直接使用 `"zod"` 导入即为 v4 |
| `ajv` | `^8.17.0` | MEDIUM | 逆向识别为 ~8.x；ajv 8 为当前稳定主线，用于 JSON Schema 验证 |
| `json-schema-traverse` | `^1.0.0` | MEDIUM | ajv 的内部依赖，版本稳定 |
| `fast-deep-equal` | `^3.1.3` | MEDIUM | ajv 的内部依赖，版本稳定 |
| `fast-uri` | `^3.0.0` | MEDIUM | ajv 8 使用的 URI 解析器，替代了 uri-js |

**架构说明**: Zod 4 为主要 schema 定义工具（类型安全 + 运行时验证）。ajv 用于需要 JSON Schema 兼容的场景（如 MCP 协议、工具参数验证）。两者在原版 Amp 中共存，保持一致。

---

## 3. AI/LLM SDK 层 (`@flitter/llm`)

| 包名 | 推荐版本 | 置信度 | 理由 |
|------|----------|--------|------|
| `@anthropic-ai/sdk` | `^0.88.0` | MEDIUM | 逆向识别到 Stainless SDK 模式；0.88.0 为 2026-04 最新版；API 变化频繁，建议锁定 minor 范围 |
| `openai` | `^6.34.0` | MEDIUM | 逆向识别到 Stainless SDK + `api.openai.com/v1`；6.x 为当前主线，含 Responses API 适配器 |
| `@google/genai` | `^1.48.0` | MEDIUM | 逆向识别到 `GoogleGenAI` 构造函数 + `generativelanguage.googleapis.com`；1.x 稳定线，替代了已废弃的 `@google/generative-ai` |
| `@cerebras/cerebras_cloud_sdk` | `latest` | LOW | 逆向识别到错误字符串引用；版本不确定，保持 latest 跟踪 |

**架构说明**: 所有 LLM SDK 均为 Stainless 或类 Stainless 生成的客户端，API 风格一致。项目采用 Provider 策略模式，通过统一内部消息格式适配各 Provider。SDK 版本迭代快，建议锁定到已测试的具体版本而非宽泛范围。

**Vercel AI SDK 评估**: 逆向代码中**未发现** `ai` (Vercel AI SDK) 的使用痕迹。原版 Amp 直接调用各 Provider 官方 SDK，而非通过统一抽象层。Flitter 应保持一致，不引入 AI SDK。置信度: HIGH。

---

## 4. MCP 协议层 (`@flitter/llm`)

| 包名 | 推荐版本 | 置信度 | 理由 |
|------|----------|--------|------|
| `@modelcontextprotocol/sdk` | `^1.29.0` | MEDIUM | 逆向识别到 StdioClientTransport, SSEClientTransport, StreamableHTTPClientTransport 三种传输；1.29.0 为 2026-04 最新版，含 OAuth 2.0 scopes_supported 改进 |

**架构说明**: MCP SDK 提供三种传输层实现。原版 Amp 使用 Stdio 和 SSE/StreamableHTTP 两种主要传输。SDK 1.x 已稳定，建议跟踪最新 1.x。

---

## 5. 可观测性层 (`@flitter/util`)

| 包名 | 推荐版本 | 置信度 | 理由 |
|------|----------|--------|------|
| `@opentelemetry/api` | `^1.9.0` | HIGH | 逆向确认 `VERSION = "1.9.0"` |
| `@opentelemetry/sdk-node` | `^0.214.0` | MEDIUM | 逆向识别到 `NodeSDK` export；0.214.0 为 2026-04 最新版 |
| `@opentelemetry/resources` | `^2.2.0` | HIGH | 逆向确认 `VERSION = "2.2.0"` |
| `@opentelemetry/sdk-trace-base` | `^2.6.0` | MEDIUM | 逆向识别到 `BasicTracerProvider`, `BatchSpanProcessor` |
| `@opentelemetry/sdk-trace-node` | `^2.6.0` | MEDIUM | 逆向识别到 `NodeTracerProvider` |
| `@opentelemetry/sdk-metrics` | `^2.6.0` | MEDIUM | 逆向识别到 `MeterProvider`, `PeriodicExportingMetricReader` |
| `@opentelemetry/sdk-logs` | `^0.214.0` | MEDIUM | 逆向识别到 `BatchLogRecordProcessor` |
| `@opentelemetry/otlp-exporter-base` | `^0.208.0` | HIGH | 逆向确认 `VERSION = "0.208.0"` |
| `@opentelemetry/otlp-grpc-exporter-base` | `^0.214.0` | MEDIUM | 逆向识别到 gRPC 传输 |
| `@opentelemetry/otlp-transformer` | `^0.214.0` | MEDIUM | 逆向识别到 JSON/Protobuf 序列化器 |
| `@opentelemetry/exporter-trace-otlp-grpc` | `^0.214.0` | MEDIUM | 逆向识别到 `OTLPTraceExporter` |
| `@opentelemetry/exporter-metrics-otlp-grpc` | `^0.214.0` | MEDIUM | 逆向识别到 `OTLPMetricExporter` |
| `@opentelemetry/exporter-logs-otlp-grpc` | `^0.214.0` | MEDIUM | 逆向识别到 `OTLPLogExporter` |
| `@opentelemetry/exporter-prometheus` | `^0.214.0` | MEDIUM | 逆向识别到 `PrometheusExporter` |
| `@opentelemetry/exporter-zipkin` | `^2.6.0` | MEDIUM | 逆向识别到 `ZipkinExporter` |
| `@opentelemetry/propagator-b3` | `^2.6.0` | MEDIUM | 逆向识别到 `B3Propagator` |
| `@opentelemetry/propagator-jaeger` | `^2.6.0` | MEDIUM | 逆向识别到 `JaegerPropagator` |
| `@opentelemetry/context-async-hooks` | `^2.6.0` | MEDIUM | 逆向识别到 `AsyncLocalStorageContextManager` |
| `@opentelemetry/instrumentation` | `^0.214.0` | MEDIUM | 逆向识别到 `InstrumentationBase` |
| `@opentelemetry/semantic-conventions` | `^1.30.0` | MEDIUM | 逆向识别到语义属性常量 |

**版本策略说明**: OTel JS 生态有两条版本线: API 层 1.x (稳定)，SDK 层 2.x/0.x (实验性但实际广泛使用)。建议统一安装 `@opentelemetry/sdk-node` 并让它自动拉取兼容的子包版本。

**优先级说明**: OTel 是基础设施可观测性，对 MVP 非关键路径。建议延后到 TUI 框架和 Agent 核心完成后再集成，先用 `debug` 包做开发调试。

---

## 6. gRPC / Protocol Buffers (`@flitter/util`)

| 包名 | 推荐版本 | 置信度 | 理由 |
|------|----------|--------|------|
| `@grpc/grpc-js` | `^1.13.4` | HIGH | 逆向确认 embedded package.json `version: "1.13.4"` |
| `@grpc/proto-loader` | `^0.7.0` | MEDIUM | 逆向识别到 `loadPackageDefinition` API |
| `protobufjs` | `^7.4.0` | MEDIUM | 逆向识别到 Reader/Writer/Field 等 Protobuf 核心类 |

**架构说明**: gRPC 用于 OTel exporter 的 gRPC 传输。如果选择 HTTP/JSON OTLP exporter，则可跳过 gRPC 依赖以减少包体积。

---

## 7. CLI / 终端层 (`@flitter/cli`, `@flitter/tui`)

| 包名 | 推荐版本 | 置信度 | 理由 |
|------|----------|--------|------|
| `commander` | `^14.0.0` | MEDIUM | 逆向识别到 `.command()`, `.option()`, `.parse()` 命令树模式；14.x 为 2026-02 发布的最新主线，含 TypeScript 类型改进 |
| `chalk` | `^5.6.0` | MEDIUM | 逆向识别为 v5+；5.x 为 ESM-only 版本，与项目 ESM-only 约束一致 |
| `ansi-styles` | `^6.2.0` | MEDIUM | chalk 的底层依赖，逆向识别到 `rgbToAnsi256()` |
| `supports-color` | `^9.4.0` | MEDIUM | chalk 的底层依赖，颜色级别检测 |
| `@xterm/headless` | `^6.0.0` | MEDIUM | 逆向识别到无头终端模拟；用于 Headless 模式的终端仿真 |
| `@napi-rs/keyring` | `^1.1.10` | HIGH | 逆向确认 `.pnpm/@napi-rs+keyring@1.1.10`；OS 原生密钥链 |

**TUI 框架说明**: `@flitter/tui` 实现 Flutter-for-Terminal 三棵树架构，为自研代码（从逆向迁移），**不依赖** 任何 TUI 框架库（如 ink、blessed 等）。它直接操作 ANSI 转义序列和终端原始模式。这是与原版 Amp 一致的设计。

---

## 8. Markdown / HTML 解析层 (`@flitter/tui`)

| 包名 | 推荐版本 | 置信度 | 理由 |
|------|----------|--------|------|
| `micromark` | `^4.0.0` | MEDIUM | 逆向识别到 CommonMark + GFM 解析器；4.0.2 为当前最新，ESM-only |
| `micromark-extension-gfm` | `^3.0.0` | MEDIUM | GFM 扩展（strikethrough/table/autolink/tasklist） |
| `micromark-extension-gfm-strikethrough` | `^2.1.0` | MEDIUM | GFM 删除线子扩展 |
| `micromark-extension-gfm-table` | `^2.1.0` | MEDIUM | GFM 表格子扩展 |
| `micromark-extension-gfm-autolink-literal` | `^2.1.0` | MEDIUM | GFM 自动链接子扩展 |
| `parse5` | `^7.2.0` | MEDIUM | 逆向识别到 HTML5 tokenizer 状态机 |
| `entities` | `^6.0.0` | MEDIUM | HTML 实体解码 |

---

## 9. 网络 / HTTP 层 (`@flitter/llm`, `@flitter/util`)

| 包名 | 推荐版本 | 置信度 | 理由 |
|------|----------|--------|------|
| `gaxios` | `^7.1.2` | HIGH | 逆向确认 embedded package.json `version: "7.1.2"`；Google SDK 内部 HTTP 客户端 |
| `https-proxy-agent` | `^7.0.0` | MEDIUM | 逆向识别到 `HttpsProxyAgent`；代理支持 |
| `ws` | `^8.18.0` | MEDIUM | 逆向识别到 WebSocket GUID；8.x 为当前稳定主线 |
| `bufferutil` | `^4.0.9` | HIGH | 逆向确认 `.pnpm/bufferutil@4.0.9`；ws 的可选原生加速 |
| `utf-8-validate` | `^6.0.5` | HIGH | 逆向确认 `.pnpm/utf-8-validate@6.0.5`；ws 的可选原生加速 |
| `node-fetch` | -- | LOW | 逆向识别但 **不推荐使用**：Bun 内置全局 `fetch`，无需 polyfill |

**推荐**: 跳过 `node-fetch`，直接使用 Bun 原生 `fetch`。逆向中出现是因为原版编译时打包了 polyfill，但 Bun 运行时不需要。

---

## 10. 状态管理与响应式 (`@flitter/util`, `@flitter/data`)

| 包名 | 推荐版本 | 置信度 | 理由 |
|------|----------|--------|------|
| `rxjs` | `^7.8.0` | MEDIUM | 逆向识别到 `.pipe()`, `.subscribe()`, `BehaviorSubject`, 操作符；7.8.2 为当前最新稳定版（8.x 仍在 alpha） |
| `immer` | `^10.1.0` | MEDIUM | 逆向识别到 `Symbol.for("immer-nothing")`, `produce`, `applyPatches`；10.x 为当前主线 |
| `zen-observable` | `^0.10.0` | MEDIUM | 逆向识别到 `Symbol.observable`；补充 RxJS 的轻量 Observable 需求 |

**架构说明**: RxJS 用于 Agent 核心的事件流管道（LLM 流式响应、工具执行事件）。Immer 用于 ThreadStore 的不可变状态更新。两者在原版中密切协作，保持一致。

---

## 11. 实用工具层 (`@flitter/util`)

| 包名 | 推荐版本 | 置信度 | 理由 |
|------|----------|--------|------|
| `debug` | `^4.3.0` | MEDIUM | 逆向识别到 `r.humanize`, `r.enable`；标准 Node.js 调试日志 |
| `ms` | `^2.1.0` | MEDIUM | 逆向识别到时间字符串解析；debug 的内部依赖 |
| `diff` | `^7.0.0` | MEDIUM | 逆向识别到 `diffWithOptionsObj()`；文本差异比较 |
| `decimal.js` | `^10.5.0` | MEDIUM | 逆向识别到完整 Decimal 类；高精度数学运算 |
| `cross-spawn` | `^7.0.0` | MEDIUM | 逆向识别到 ENOENT 钩子；跨平台子进程启动 |
| `which` | `^4.0.0` | MEDIUM | 逆向识别到 `isexe`, PATHEXT；可执行文件查找 |
| `picomatch` | `^4.0.0` | MEDIUM | 逆向识别到 glob 模式常量；4.0.4 为当前最新 |
| `qs` | `^6.13.0` | MEDIUM | 逆向识别到 `stringify` + `addQueryPrefix`；URL 查询字符串 |
| `yaml` | `^2.7.0` | MEDIUM | 逆向识别到 `YAML.stringify`；YAML 解析/生成 |
| `vscode-uri` | `^3.1.0` | MEDIUM | 逆向识别到 URI 类 + `fsPath`；VS Code 风格 URI |
| `image-size` | `^2.0.0` | MEDIUM | 逆向识别到图片尺寸检测 |
| `file-type` | `^19.6.0` | MEDIUM | 逆向识别到 magic bytes MIME 检测 |

---

## 12. 浏览器 Polyfill (不推荐引入)

| 逆向包名 | 推荐 | 理由 |
|----------|------|------|
| `crypto-browserify` | **跳过** | Bun 原生支持 `crypto` 模块 |
| `browserify-zlib` | **跳过** | Bun 原生支持 `zlib` 模块 |
| `stream-http` | **跳过** | Bun 原生支持 `http`/`https` 模块 |
| `punycode` | **跳过** | Bun 原生支持 `punycode` 模块 (Node.js 兼容) |
| `querystring-es3` | **跳过** | Bun 原生支持 `querystring` 模块 |
| `elliptic` | **跳过** | Bun 原生支持 `crypto` 的 ECDH/ECDSA |
| `pako` | **评估** | 如果仅用于 gRPC 传输的 gzip 压缩，可能仍需要；否则用 Bun 原生 zlib |

**理由**: 这些 polyfill 出现在逆向代码中是因为原版使用 esbuild 将 Node.js 内置模块打包进二进制。Bun 运行时原生支持这些 API，无需 polyfill。置信度: HIGH。

---

## 13. 开发工具链

| 工具 | 推荐版本 | 置信度 | 理由 |
|------|----------|--------|------|
| `typescript` | `^5.8.0` | HIGH | 当前稳定线；含 `--erasableSyntaxOnly` 等 Bun 友好特性 |
| `bun-types` | `^1.3.0` | HIGH | 匹配 Bun 1.3.x 运行时类型 |
| Bun test runner | 内置 | HIGH | PROJECT.md 约束使用 Bun 内置测试器 |
| Bun bundler | 内置 | HIGH | 根 package.json 已配置 `bun build` |

**Lint 工具评估**: 当前 lint 脚本为占位符。推荐：
- `@biomejs/biome` `^1.9.0` -- Rust 编写的极速 linter + formatter，与 Bun 生态契合度高
- 或 `oxlint` -- 同为 Rust 实现，专注 lint（不含 format）
- 置信度: LOW（逆向未识别到 lint 工具偏好）

---

## 14. 依赖分层归属

```
@flitter/schemas (Layer 1 -- 纯类型)
  └── zod ^4.0.0

@flitter/util (Layer 2 -- 基础设施)
  ├── rxjs ^7.8.0
  ├── immer ^10.1.0
  ├── debug ^4.3.0 / ms ^2.1.0
  ├── vscode-uri ^3.1.0
  ├── picomatch ^4.0.0
  ├── cross-spawn ^7.0.0 / which ^4.0.0
  ├── diff ^7.0.0
  ├── yaml ^2.7.0
  ├── @napi-rs/keyring ^1.1.10
  ├── @opentelemetry/* (延后)
  └── @grpc/* + protobufjs (延后, 随 OTel)

@flitter/tui (Layer 3 -- TUI 框架, 零内部依赖)
  ├── micromark ^4.0.0 + GFM 扩展
  ├── parse5 ^7.2.0
  ├── entities ^6.0.0
  ├── chalk ^5.6.0
  ├── ansi-styles ^6.2.0
  ├── supports-color ^9.4.0
  └── @xterm/headless ^6.0.0

@flitter/llm (Layer 3 -- LLM & MCP)
  ├── @anthropic-ai/sdk ^0.88.0
  ├── openai ^6.34.0
  ├── @google/genai ^1.48.0
  ├── @modelcontextprotocol/sdk ^1.29.0
  ├── gaxios ^7.1.2
  ├── https-proxy-agent ^7.0.0
  └── ws ^8.18.0 + bufferutil + utf-8-validate

@flitter/agent-core (Layer 3 -- Agent 核心)
  └── (无额外第三方依赖, 依赖 @flitter/schemas + @flitter/util)

@flitter/data (Layer 3 -- 数据层)
  ├── ajv ^8.17.0
  └── (无额外大型依赖, 依赖 @flitter/schemas + @flitter/util)

@flitter/cli (Layer 4 -- CLI 入口)
  ├── commander ^14.0.0
  └── (依赖 @flitter/agent-core + tui + data + llm)
```

---

## 15. 与 DEPENDENCIES.md 差异摘要

| 类别 | 变更 | 理由 |
|------|------|------|
| **跳过 6 个 polyfill** | crypto-browserify, browserify-zlib, stream-http, punycode, querystring-es3, elliptic | Bun 原生支持，无需 polyfill |
| **跳过 node-fetch** | 不引入 | Bun 原生 `fetch` |
| **跳过 node-gyp-build** | 不引入 | Bun 有自己的 native addon 加载机制 |
| **跳过 import-in-the-middle** | 不引入 | OTel instrumentation 的 ESM 钩子，Bun 运行时不需要 |
| **跳过 module-details-from-path** | 不引入 | OTel instrumentation 辅助，同上 |
| **延后 OTel 全栈** | 18 个 @opentelemetry/* 包 | MVP 非关键路径，先用 debug 包 |
| **延后 gRPC** | @grpc/* + protobufjs | 仅 OTel gRPC exporter 需要，可用 HTTP/JSON exporter 替代 |
| **Zod 版本确认** | 4.3.6 -> `^4.0.0` | Zod 4 正式发布，4.0.x = 4.3.x (子路径版本方案已完成过渡) |

---

## 16. 总结：核心技术栈清单

| 层次 | 核心包 | 数量 |
|------|--------|------|
| 运行时 | Bun 1.3.x + TypeScript 5.8.x | 2 |
| Schema | zod 4, ajv 8 | 2 |
| LLM SDK | @anthropic-ai/sdk, openai, @google/genai | 3 |
| MCP | @modelcontextprotocol/sdk | 1 |
| CLI | commander | 1 |
| 终端渲染 | chalk, @xterm/headless, micromark + GFM | 4 |
| 状态/响应式 | rxjs, immer | 2 |
| 网络 | ws, gaxios, https-proxy-agent | 3 |
| 安全 | @napi-rs/keyring | 1 |
| 工具 | debug, diff, picomatch, cross-spawn, which, yaml, vscode-uri | 7 |
| **合计** | -- | **~26 核心包** |

相比逆向识别的 62 个包，精简为 ~26 个核心包 + ~18 个延后的 OTel/gRPC 包 + 跳过 ~8 个不需要的 polyfill/辅助包。此分布符合终端 AI Agent CLI 的 2025 标准技术栈。

---

*Last updated: 2026-04-12*
