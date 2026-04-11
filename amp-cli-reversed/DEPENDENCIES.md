# Amp CLI — Third-Party Dependencies

> Extracted from reverse-engineered `amp` binary (Bun-compiled, esbuild-bundled).
> Generated: 2026-04-11

## Summary

| Category | Count |
|---|---|
| Total distinct npm packages | **62** |
| With confirmed version | **11** |
| With unknown version | **51** |

---

## Dependencies (Alphabetical)

| # | Package | Version | Embedding | Evidence |
|---|---------|---------|-----------|----------|
| 1 | `@anthropic-ai/sdk` | unknown | vendor/esm (17 files) + scope-hoisted | Stainless SDK pattern, `Symbol("anthropic.sdk.stainlessHelper")`, `/v1/messages` endpoints |
| 2 | `@cerebras/cerebras_cloud_sdk` | unknown | scope-hoisted | `import '@cerebras/cerebras_cloud_sdk/shims/${T.kind}'` error string |
| 3 | `@google/genai` | unknown | scope-hoisted | `new GoogleGenAI({apiKey})`, `generativelanguage.googleapis.com` base URL |
| 4 | `@grpc/grpc-js` | **1.13.4** | vendor/cjs (~69 files) | Embedded `package.json`: `name: "@grpc/grpc-js", version: "1.13.4"` |
| 5 | `@grpc/proto-loader` | unknown | vendor/cjs (~5 files) | `loadPackageDefinition`, `makeClientConstructor` API |
| 6 | `@modelcontextprotocol/sdk` | unknown | scope-hoisted | StdioClientTransport, SSEClientTransport, StreamableHTTPClientTransport |
| 7 | `@napi-rs/keyring` | **1.1.10** | scope-hoisted | `.pnpm/@napi-rs+keyring@1.1.10` path literal |
| 8 | `@opentelemetry/api` | **1.9.0** | vendor/cjs (~69 files) | `VERSION = "1.9.0"` constant |
| 9 | `@opentelemetry/context-async-hooks` | unknown | vendor/cjs (4 files) | `AsyncLocalStorageContextManager` export |
| 10 | `@opentelemetry/core` | unknown | vendor/cjs (~35 files) | `W3CTraceContextPropagator`, `RandomIdGenerator`, `hrTime` |
| 11 | `@opentelemetry/exporter-logs-otlp-*` | unknown | vendor/cjs (~10 files) | `OTLPLogExporter` exports |
| 12 | `@opentelemetry/exporter-metrics-otlp-*` | unknown | vendor/cjs (~10 files) | `OTLPMetricExporter` exports |
| 13 | `@opentelemetry/exporter-prometheus` | unknown | vendor/cjs (3 files) | `PrometheusExporter`, `PrometheusSerializer` |
| 14 | `@opentelemetry/exporter-trace-otlp-*` | unknown | vendor/cjs (~10 files) | `OTLPTraceExporter` exports |
| 15 | `@opentelemetry/exporter-zipkin` | unknown | vendor/cjs (~4 files) | `ZipkinExporter`, `toZipkinAnnotations` |
| 16 | `@opentelemetry/instrumentation` | unknown | vendor/cjs (~15 files) | `InstrumentationBase`, `registerInstrumentations` |
| 17 | `@opentelemetry/otlp-exporter-base` | **0.208.0** | vendor/cjs (~25 files) | `VERSION = "0.208.0"` constant |
| 18 | `@opentelemetry/otlp-grpc-exporter-base` | unknown | vendor/cjs (~8 files) | gRPC transport, `create-otlp-grpc-export-delegate` |
| 19 | `@opentelemetry/otlp-transformer` | unknown | vendor/cjs (~18 files) | JSON/Protobuf serializers for traces/metrics/logs |
| 20 | `@opentelemetry/propagator-b3` | unknown | vendor/cjs (7 files) | `B3Propagator`, `B3MultiPropagator` |
| 21 | `@opentelemetry/propagator-jaeger` | unknown | vendor/cjs (2 files) | `JaegerPropagator`, `UBER_TRACE_ID_HEADER` |
| 22 | `@opentelemetry/resources` | **2.2.0** | vendor/cjs (~20 files) | `VERSION = "2.2.0"` constant |
| 23 | `@opentelemetry/sdk-logs` | unknown | vendor/cjs (~15 files) | `BatchLogRecordProcessor`, `LogRecordImpl` |
| 24 | `@opentelemetry/sdk-metrics` | unknown | vendor/cjs (~55 files) | `MeterProvider`, `PeriodicExportingMetricReader` |
| 25 | `@opentelemetry/sdk-node` | unknown | vendor/cjs (~5 files) | `NodeSDK` export |
| 26 | `@opentelemetry/sdk-trace-base` | unknown | vendor/cjs (~20 files) | `BasicTracerProvider`, `BatchSpanProcessor` |
| 27 | `@opentelemetry/sdk-trace-node` | unknown | vendor/cjs (~5 files) | `NodeTracerProvider` export |
| 28 | `@opentelemetry/semantic-conventions` | unknown | vendor/cjs (~8 files) | `ATTR_TELEMETRY_SDK_NAME`, semantic attribute constants |
| 29 | `@xterm/headless` | unknown | scope-hoisted | `new Terminal({ cols: 1000, rows: 500 })` |
| 30 | `ajv` | unknown (~8.x) | vendor/cjs (~65 files) | `Ajv`, `CodeGen`, `KeywordCxt`, `ValidationError` |
| 31 | `ansi-styles` | unknown | scope-hoisted (with chalk) | `rgbToAnsi256()`, `hexToRgb()`, ANSI escape codes |
| 32 | `browserify-zlib` | unknown | esbuild-bundle-6 | `exports_zlib`, Deflate/Inflate/Gzip/Gunzip classes |
| 33 | `bufferutil` | **4.0.9** | vendor/cjs (2 files) | `.pnpm/bufferutil@4.0.9` path |
| 34 | `chalk` | unknown (v5+) | scope-hoisted | Color level detection, `FORCE_COLOR` env var checks |
| 35 | `commander` | unknown | scope-hoisted | `.command()`, `.option()`, `.argument()`, `.action()`, `.parse()` |
| 36 | `cross-spawn` | unknown | vendor/cjs (2 files) | ENOENT hook, wraps `child_process.spawn` |
| 37 | `crypto-browserify` | unknown | esbuild-bundle-2 | Full browser crypto API polyfill |
| 38 | `debug` | unknown | vendor/cjs (3 files) | `r.humanize`, `r.enable`, `r.disable`, `r.formatters` |
| 39 | `decimal.js` | unknown | scope-hoisted | Full Decimal class, ROUND_* constants, math methods |
| 40 | `diff` | unknown | scope-hoisted | `diffWithOptionsObj()`, longest common subsequence algorithm |
| 41 | `elliptic` | **6.6.1** | esbuild-bundle-2 | Version string `"6.6.1"` embedded |
| 42 | `entities` | unknown | scope-hoisted | HTML entity decoder state machine |
| 43 | `extend` | unknown | vendor/cjs (1 file) | Deep extend with `__proto__` safety |
| 44 | `fast-deep-equal` | unknown | vendor/cjs (1 file) | Referenced as `require("ajv/dist/runtime/equal")` |
| 45 | `fast-uri` | unknown | vendor/cjs (4 files) | URI parsing/normalization, referenced by ajv |
| 46 | `fetch-blob` | unknown | vendor/esm (1 file) | `/*! fetch-blob. MIT License. Jimmy W` (truncated) |
| 47 | `file-type` | unknown | scope-hoisted | MIME type detection by magic bytes |
| 48 | `gaxios` | **7.1.2** | vendor/cjs (5 files) | Embedded `package.json`: `name: "gaxios", version: "7.1.2"` |
| 49 | `https-proxy-agent` | unknown | vendor/cjs (3 files) | `HttpsProxyAgent` export |
| 50 | `image-size` | unknown | vendor/esm (1 file) | BMP/ICO/GIF/HEIF image dimension detection |
| 51 | `immer` | unknown (~10.x) | vendor/esm (1 file) | `Symbol.for("immer-nothing")`, `produce`, `applyPatches` |
| 52 | `import-in-the-middle` | unknown | vendor/cjs (1 file) | ESM loader hook architecture |
| 53 | `json-schema-traverse` | unknown | vendor/cjs (1 file) | Schema traverser with `arrayKeywords`, `propsKeywords` |
| 54 | `micromark` (+ GFM extensions) | unknown | scope-hoisted | Markdown tokenizer, GFM strikethrough/table/autolink |
| 55 | `module-details-from-path` | unknown | vendor/cjs (1 file) | `node_modules` path parser for scoped packages |
| 56 | `ms` | unknown | vendor/cjs (1 file) | Time string parsing (milliseconds/seconds/minutes/hours) |
| 57 | `node-fetch` | unknown | scope-hoisted | `"node-fetch cannot load"` error string |
| 58 | `node-gyp-build` | unknown | vendor/cjs (2 files) | Native addon loader with `PREBUILDS_ONLY` |
| 59 | `openai` | unknown | scope-hoisted | `baseURL: "https://api.openai.com/v1"`, Stainless SDK |
| 60 | `pako` | unknown | vendor/esm (1 file) | zlib constants, deflate/inflate API |
| 61 | `parse5` | unknown | scope-hoisted | HTML tokenizer states (RCDATA, RAWTEXT, SCRIPT_DATA) |
| 62 | `picomatch` | unknown | vendor/cjs (6 files) | Glob pattern constants, scan/parse/compile pipeline |
| 63 | `protobufjs` | unknown | vendor/cjs (~29 files) | Reader/Writer/Field/Enum/ReflectionObject classes |
| 64 | `punycode` | **2.3.1** | esbuild-bundle-4 | Version string `"2.3.1"` embedded |
| 65 | `qs` | unknown | scope-hoisted | `stringify` with `addQueryPrefix`, `allowDots`, `charsetSentinel` |
| 66 | `querystring-es3` | unknown | esbuild-bundle-5 | `import_querystring_es3`, encode/decode/stringify/parse |
| 67 | `rxjs` | unknown | scope-hoisted | `.pipe()`, `.subscribe()`, BehaviorSubject, operators |
| 68 | `stream-http` | unknown | esbuild-bundle-3 | Browser HTTP client polyfill |
| 69 | `supports-color` | unknown | scope-hoisted (with chalk) | `FORCE_COLOR`, `TERM_PROGRAM`, CI env var detection |
| 70 | `utf-8-validate` | **6.0.5** | vendor/cjs (3 files) | `.pnpm/utf-8-validate@6.0.5` path |
| 71 | `vscode-uri` | unknown | vendor/esm (2 files) | URI class with `fsPath`, RFC 3986 regex |
| 72 | `which` | unknown | vendor/cjs (9 files) | `isexe`, PATHEXT handling, path walking |
| 73 | `ws` | unknown | vendor/cjs (11 files) | GUID `"258EAFA5-E914-47DA-95CA-C5AB0DC85B11"`, WebSocket |
| 74 | `yaml` | unknown | scope-hoisted | `YAML.stringify`, `YAMLParseError`, block scalar syntax |
| 75 | `zen-observable` | unknown | vendor/esm (2 files) | `Symbol.observable`, Observable class with `subscribe/pipe/from/of` |

---

## Packages with Confirmed Versions

| Package | Version | Source |
|---------|---------|--------|
| `@grpc/grpc-js` | 1.13.4 | Embedded `package.json` |
| `@napi-rs/keyring` | 1.1.10 | `.pnpm` path literal |
| `@opentelemetry/api` | 1.9.0 | `VERSION` constant |
| `@opentelemetry/otlp-exporter-base` | 0.208.0 | `VERSION` constant |
| `@opentelemetry/resources` | 2.2.0 | `VERSION` constant |
| `bufferutil` | 4.0.9 | `.pnpm` path literal |
| `elliptic` | 6.6.1 | Embedded version string |
| `gaxios` | 7.1.2 | Embedded `package.json` |
| `punycode` | 2.3.1 | Embedded version string |
| `utf-8-validate` | 6.0.5 | `.pnpm` path literal |
| `zod` | 4.3.6 | Version object `{ major: 4, minor: 3, patch: 6 }` |

---

## Package Distribution by Embedding Type

| Embedding Type | Packages | Description |
|---|---|---|
| **vendor/cjs** | 42 | Standard CJS modules wrapped in RT helper |
| **vendor/esm** | 8 | ESM modules wrapped in PT helper |
| **scope-hoisted** | 19 | Inlined into app/framework/util scope-hoisted code |
| **esbuild sub-bundles** | 6 | Node.js polyfills in esbuild sub-bundles |

> Note: Some packages (e.g., `@anthropic-ai/sdk`, `@opentelemetry/*`, `zod`) appear in multiple embedding types.

---

## Major Dependency Categories

### AI/LLM SDKs
- `@anthropic-ai/sdk` — Anthropic Claude API client (Stainless-generated)
- `openai` — OpenAI API client (Stainless-generated)
- `@google/genai` — Google Generative AI (Gemini) client
- `@cerebras/cerebras_cloud_sdk` — Cerebras Cloud inference client

### Observability (OpenTelemetry)
- `@opentelemetry/api` (1.9.0), `@opentelemetry/core`, `@opentelemetry/sdk-node`
- `@opentelemetry/sdk-trace-base`, `@opentelemetry/sdk-trace-node`
- `@opentelemetry/sdk-metrics`, `@opentelemetry/sdk-logs`
- `@opentelemetry/resources` (2.2.0), `@opentelemetry/semantic-conventions`
- `@opentelemetry/otlp-exporter-base` (0.208.0), `@opentelemetry/otlp-grpc-exporter-base`
- `@opentelemetry/otlp-transformer`
- `@opentelemetry/exporter-trace-otlp-*`, `@opentelemetry/exporter-metrics-otlp-*`, `@opentelemetry/exporter-logs-otlp-*`
- `@opentelemetry/exporter-prometheus`, `@opentelemetry/exporter-zipkin`
- `@opentelemetry/propagator-b3`, `@opentelemetry/propagator-jaeger`
- `@opentelemetry/context-async-hooks`, `@opentelemetry/instrumentation`

### gRPC / Protocol Buffers
- `@grpc/grpc-js` (1.13.4), `@grpc/proto-loader`
- `protobufjs`

### Schema Validation
- `zod` (4.3.6), `ajv` (~8.x)
- `json-schema-traverse`, `fast-deep-equal`, `fast-uri`

### CLI / Terminal
- `commander`, `chalk` (v5+), `ansi-styles`, `supports-color`
- `@xterm/headless`, `@napi-rs/keyring` (1.1.10)

### Markdown / HTML
- `micromark` (+ GFM extensions), `parse5`, `entities`

### Networking / HTTP
- `gaxios` (7.1.2), `https-proxy-agent`, `node-fetch`
- `ws`, `bufferutil` (4.0.9), `utf-8-validate` (6.0.5)

### MCP (Model Context Protocol)
- `@modelcontextprotocol/sdk`

### Utility Libraries
- `immer`, `rxjs`, `debug`, `ms`, `diff`, `decimal.js`
- `cross-spawn`, `which`, `picomatch`, `qs`, `yaml`
- `pako`, `vscode-uri`, `image-size`, `file-type`, `zen-observable`

### Browser Polyfills (in esbuild sub-bundles)
- `crypto-browserify`, `elliptic` (6.6.1), `browserify-zlib`
- `stream-http`, `punycode` (2.3.1), `querystring-es3`
