# Analysis 12: ACP Types and Connection Layer

## Files Analyzed

- `/home/gem/workspace/flitter/packages/flitter-amp/src/acp/types.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/acp/connection.ts`

## types.ts: Type Re-exports and Conversation Model

### SDK Re-exports

The file begins by re-exporting a comprehensive set of request/response type pairs from `@agentclientprotocol/sdk`. These cover the full ACP lifecycle:

- **Session management**: `InitializeRequest`/`Response`, `NewSessionRequest`/`Response`, `LoadSessionRequest`/`Response`, `SessionNotification`
- **Prompting**: `PromptRequest`/`Response`, `CancelNotification`
- **Authentication**: `AuthenticateRequest`/`Response`
- **Permissions and filesystem**: `RequestPermissionRequest`/`Response`, `ReadTextFileRequest`/`Response`, `WriteTextFileRequest`/`Response`
- **Terminal**: `CreateTerminalRequest`/`Response`

This re-export pattern means downstream consumers within flitter-amp can import all ACP protocol types from the local `types` module rather than depending directly on the SDK. This is a standard facade pattern that simplifies refactoring and version upgrades.

### ConversationItem Union Type

The central abstraction for the TUI conversation model is the discriminated union:

```typescript
type ConversationItem = UserMessage | AssistantMessage | ToolCallItem | PlanItem | ThinkingItem;
```

Each variant carries a string literal `type` discriminator, enabling exhaustive switch/match handling in the rendering layer. The five variants are:

1. **UserMessage** (`type: 'user_message'`): Contains `text` and `timestamp`. Straightforward representation of user input.

2. **AssistantMessage** (`type: 'assistant_message'`): Adds an `isStreaming` boolean alongside `text` and `timestamp`. The streaming flag allows the TUI to render partial content with a cursor or animation while tokens are still arriving, then finalize the display when streaming completes.

3. **ToolCallItem** (`type: 'tool_call'`): The most complex variant. It tracks a tool invocation through its full lifecycle via a `status` field with four states: `pending`, `in_progress`, `completed`, and `failed`. Fields include `toolCallId` for correlation, `title` and `kind` for display classification, an optional `locations` array of file paths that the tool touched, `rawInput` for the original invocation parameters, an optional `result` of type `ToolCallResult`, and a `collapsed` boolean for UI fold state.

4. **ThinkingItem** (`type: 'thinking'`): Represents extended reasoning or chain-of-thought output. Like `AssistantMessage`, it has `isStreaming` and `collapsed` for progressive disclosure in the UI.

5. **PlanItem** (`type: 'plan'`): Contains an array of `PlanEntry` objects, each with `content`, a three-tier `priority` (`high`/`medium`/`low`), and a `status` field (`pending`/`in_progress`/`completed`). This models todo-list-style task plans that an agent might produce.

### ToolCallResult

The nested `ToolCallResult` interface has `status` (`completed` or `failed`), an optional `content` array with a two-level nesting structure (outer object has `type` and optional inner `content` with `type` and `text`), and `rawOutput` for unstructured data. The double-level content nesting suggests the result format mirrors ACP's content block structure, where each block can wrap inner text content.

### UsageInfo

The `UsageInfo` interface tracks resource consumption with three fields: `size` (total capacity), `used` (consumed amount), and an optional `cost` object containing `amount` and `currency`. The cost field is nullable (`| null`), allowing explicit representation of "no cost data available" versus "cost is zero." This shape is likely used for context window tracking and billing display in the TUI status bar.

## connection.ts: ACP Connection Lifecycle

### Module Dependencies

The connection module imports from `@agentclientprotocol/sdk` for the core protocol types and `ClientSideConnection`, from Node.js `stream` for stdio bridging, from a local `logger` utility, from a `process` utility for subprocess management, and from the local `FlitterClient` implementation.

### ConnectionHandle Interface

The `ConnectionHandle` bundles everything needed to interact with a connected agent:

```typescript
interface ConnectionHandle {
  connection: acp.ClientSideConnection;
  client: FlitterClient;
  agent: AgentProcess;
  capabilities: acp.AgentCapabilities | undefined;
  agentInfo?: { name?: string; title?: string };
  sessionId: string;
}
```

This is the primary return value from the initialization flow. It gives callers access to the raw connection for sending protocol messages, the client instance for callback management, the subprocess handle for lifecycle control (e.g., kill), negotiated capabilities, optional agent metadata, and the active session ID.

### connectToAgent: The Six-Step Initialization Flow

The `connectToAgent` function implements the complete ACP handshake:

**Step 1 -- Spawn agent process**: Delegates to `spawnAgent()` which creates a child process with the given command, arguments, and working directory. The agent is expected to communicate via stdio.

**Step 2 -- Create ND-JSON stream**: The subprocess's `stdout` and `stdin` are converted from Node.js streams to Web Streams API (`ReadableStream<Uint8Array>` and `WritableStream<Uint8Array>`) using `Readable.toWeb()` and `Writable.toWeb()`. These are then wrapped via `acp.ndJsonStream()` to create a newline-delimited JSON transport. This is the JSON-RPC communication layer -- each message is a single JSON object terminated by a newline, which is the standard ACP transport format.

**Step 3 -- Create client and connection**: A `FlitterClient` instance is created with the provided callbacks. Then a `ClientSideConnection` is instantiated, receiving a factory function `(agentProxy: Agent) => Client` that returns the FlitterClient. The factory pattern allows the SDK to inject an agent proxy for making reverse calls. The `as unknown as acp.Client` cast indicates FlitterClient implements the interface but TypeScript needs coercion, likely because FlitterClient extends or partially implements the Client interface.

**Step 4 -- Initialize (protocol negotiation)**: The initialize request declares:
- `protocolVersion`: Uses `acp.PROTOCOL_VERSION` constant for version alignment
- `clientInfo`: Identifies as `flitter-amp` version `0.1.0`
- `clientCapabilities`: Advertises support for filesystem operations (`readTextFile` and `writeTextFile` both true) and terminal access (`terminal: true`)

The response yields `agentInfo` (name and other metadata) and `agentCapabilities`, which the client stores for feature gating.

**Step 5 -- Create session**: A new session is created with the working directory and an empty `mcpServers` array. The session response provides a `sessionId` used for all subsequent prompt and cancel operations.

**Step 6 -- Return handle**: All artifacts are bundled into a `ConnectionHandle` and returned.

### sendPrompt

A thin wrapper that sends a text prompt to a specific session. The prompt content is wrapped in a `[{ type: 'text', text }]` array, following the ACP content block format. The response is cast to extract a `stopReason`, defaulting to `'end_turn'` if not present. The `as any` cast suggests the SDK's response type may not include `stopReason` in its type definition, or it may be an extension.

### cancelPrompt

Sends a cancel notification for a given session. This is a fire-and-forget operation that tells the agent to abort its current processing. The function awaits the cancel call, which likely resolves once the cancellation notification has been acknowledged.

## Architectural Observations

The types and connection modules together form the foundational protocol layer of flitter-amp. The types file decouples the TUI rendering model from the raw ACP protocol types -- the `ConversationItem` union is a UI-oriented abstraction, while the re-exported SDK types handle wire protocol concerns. The connection module encapsulates the entire subprocess-based JSON-RPC setup behind a clean async function, so higher layers only deal with the `ConnectionHandle` and the `sendPrompt`/`cancelPrompt` helpers. The ND-JSON over stdio approach means no network sockets are needed; the agent runs as a local child process, and all communication happens through piped standard streams converted to the Web Streams API for compatibility with the ACP SDK's transport layer.
