/**
 * Title generation utility — generates a short thread title from the first user message.
 *
 * 逆向: amp-cli-reversed/modules/1344_unknown_tzT.js (generateThreadTitle / tzT)
 *        amp-cli-reversed/modules/1602_unknown_pm.js:1 (kr — extractTextFromContent)
 *        amp-cli-reversed/chunk-005.js:89642 (mb = n8.CLAUDE_HAIKU_4_5.name)
 *
 * This module provides:
 * - TITLE_MODEL: the model to use for title generation (Haiku)
 * - TITLE_SYSTEM_PROMPT: exact system prompt from amp
 * - TITLE_TOOL_DEFINITION: the set_title tool schema
 * - extractTextFromContent(): extract text from content blocks (amp's kr())
 * - TitleGenerationProvider: interface for non-streaming LLM calls
 * - generateThreadTitle(): fire-and-forget title generation
 */

// ─── Constants ───────────────────────────────────────────

/**
 * Model used for title generation.
 * 逆向: amp-cli-reversed/chunk-005.js:89642
 *   `mb = n8.CLAUDE_HAIKU_4_5.name` → "claude-haiku-4-5-20251001"
 *
 * Note: amp's chunk-005.js:66718 defines CLAUDE_HAIKU_4_5.name = "claude-haiku-4-5-20251001"
 */
export const TITLE_MODEL = "claude-haiku-4-5-20251001";

/**
 * System prompt for title generation.
 * 逆向: amp-cli-reversed/modules/1344_unknown_tzT.js:19
 *   Exact string from amp's generateThreadTitle system param.
 */
export const TITLE_SYSTEM_PROMPT = `You are an assistant that generates short, descriptive titles (maximum 5 words, "Sentence case" with the first word capitalized not "Title Case") based on user's message to an agentic coding tool. Your titles should be concise (max 5 words) and capture the essence of the query or topic. DO NOT ASSUME OR GUESS the user's intent beyond what is in their message. Omit generic words like "question", "request", etc. Be professional and precise. Use common software engineering terms and acronyms if they are helpful. Use the set_title tool to provide your answer.`;

/**
 * Tool definition for the set_title tool.
 * 逆向: amp-cli-reversed/modules/1344_unknown_tzT.js:24-36
 */
export const TITLE_TOOL_DEFINITION = {
  name: "set_title",
  input_schema: {
    type: "object" as const,
    properties: {
      title: {
        type: "string" as const,
        description:
          'The short thread title (maximum 5 words, "Sentence case" with the first word capitalized not "Title Case") that you generated for the message',
      },
    },
    required: ["title"] as const,
  },
};

// ─── Content extraction ──────────────────────────────────

/**
 * Extract text from content blocks — returns concatenated text joined by double newlines.
 *
 * 逆向: amp-cli-reversed/modules/1602_unknown_pm.js:1-4
 *   ```
 *   function kr(T) {
 *     return T.map(R => R.type === "text" ? R.text : null).filter(R => R !== null).join("\n\n");
 *   }
 *   ```
 */
export function extractTextFromContent(
  content: ReadonlyArray<{ type: string; text?: string }>,
): string {
  return content
    .map((block) => (block.type === "text" ? (block.text ?? null) : null))
    .filter((text): text is string => text !== null)
    .join("\n\n");
}

// ─── Provider interface ──────────────────────────────────

/**
 * Response shape from createMessage (mirrors Anthropic SDK response subset).
 */
export interface TitleGenerationResponse {
  content: Array<{
    type: string;
    id?: string;
    name?: string;
    input?: unknown;
    text?: string;
  }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

/**
 * Provider interface for non-streaming LLM calls (title generation).
 * This is a narrow interface that AnthropicProvider will satisfy via createMessage().
 */
export interface TitleGenerationProvider {
  createMessage(
    params: {
      model: string;
      max_tokens: number;
      temperature: number;
      system: string;
      messages: Array<{ role: string; content: string }>;
      tools: (typeof TITLE_TOOL_DEFINITION)[];
      tool_choice: { type: string; name: string; disable_parallel_tool_use: boolean };
    },
    opts?: { signal?: AbortSignal },
  ): Promise<TitleGenerationResponse>;
}

// ─── Options ─────────────────────────────────────────────

export interface GenerateTitleOptions {
  /** Content blocks from the first user message */
  content: ReadonlyArray<{ type: string; text?: string }>;
  /** Thread ID for logging/headers */
  threadId: string;
  /** Provider that supports createMessage */
  provider: TitleGenerationProvider;
  /** Abort signal */
  signal?: AbortSignal;
}

export interface GenerateTitleResult {
  title: string | undefined;
  usage:
    | {
        inputTokens: number;
        outputTokens: number;
        cacheCreationInputTokens: number;
        cacheReadInputTokens: number;
        totalInputTokens: number;
        timestamp: string;
      }
    | undefined;
}

// ─── generateThreadTitle ─────────────────────────────────

/**
 * Generate a thread title from the first user message content.
 *
 * 逆向: amp-cli-reversed/modules/1344_unknown_tzT.js (full function)
 *
 * Flow:
 * 1. Extract text from content blocks via extractTextFromContent (amp's kr())
 * 2. If no text, return { title: undefined, usage: undefined }
 * 3. Call provider.createMessage with forced set_title tool
 * 4. Extract title from tool_use response
 * 5. Return { title, usage }
 */
export async function generateThreadTitle(
  opts: GenerateTitleOptions,
): Promise<GenerateTitleResult> {
  const { content, threadId, provider, signal } = opts;

  // Step 1: Extract text from content blocks
  // 逆向: `let r = kr(T.content);`
  const text = extractTextFromContent(content);

  // Step 2: If no text, bail out
  // 逆向: `if (!r) return { title: void 0, usage: void 0 };`
  if (!text) {
    return { title: undefined, usage: undefined };
  }

  // Step 3: Call provider.createMessage
  // 逆向: `await (...).messages.create({ model: mb, max_tokens: 60, ... })`
  const response = await provider.createMessage(
    {
      model: TITLE_MODEL,
      max_tokens: 60,
      temperature: 0.7,
      system: TITLE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `<message>${text}</message>`,
        },
      ],
      tools: [TITLE_TOOL_DEFINITION],
      tool_choice: {
        type: "tool",
        name: "set_title",
        disable_parallel_tool_use: true,
      },
    },
    { signal },
  );

  // Step 4: Extract title from response
  // 逆向: amp-cli-reversed/modules/1344_unknown_tzT.js:63-67
  //   `let l = i.content.at(0);`
  //   `if (l.type !== "tool_use" || l.name !== "set_title") throw ...`
  //   `return { title: l.input?.title (string check), usage: A }`
  const firstBlock = response.content.at(0);

  if (!firstBlock || firstBlock.type !== "tool_use" || firstBlock.name !== "set_title") {
    // 逆向: amp throws here, but Flitter is more lenient — return undefined
    // (since this is fire-and-forget, throwing would just be caught)
    return { title: undefined, usage: undefined };
  }

  // 逆向: `l.input && typeof l.input === "object" && "title" in l.input && typeof l.input.title === "string" ? l.input.title : void 0`
  const input = firstBlock.input;
  const title =
    input &&
    typeof input === "object" &&
    "title" in (input as Record<string, unknown>) &&
    typeof (input as Record<string, unknown>).title === "string"
      ? ((input as Record<string, unknown>).title as string)
      : undefined;

  // Step 5: Build usage info
  // 逆向: amp-cli-reversed/modules/1344_unknown_tzT.js:53-62
  const usage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheCreationInputTokens: response.usage.cache_creation_input_tokens ?? 0,
    cacheReadInputTokens: response.usage.cache_read_input_tokens ?? 0,
    totalInputTokens:
      response.usage.input_tokens +
      (response.usage.cache_creation_input_tokens ?? 0) +
      (response.usage.cache_read_input_tokens ?? 0),
    timestamp: new Date().toISOString(),
  };

  void threadId; // used for logging/headers in amp; kept for interface compatibility

  return { title, usage };
}
