// Task tool executor for flitter-cli.
//
// Launches a sub-prompt using the same provider. For the initial
// implementation this runs as a sequential inline execution:
// sends the prompt to the provider, streams the response, and
// returns the accumulated text as the tool result.

import type { ToolExecutor, ToolResult, ToolContext } from './executor';
import type { Provider, PromptOptions } from '../provider/provider';
import type { ProviderMessage } from '../state/types';
import { log } from '../utils/logger';

/**
 * TaskExecutor handles the Task tool (sub-agent).
 *
 * It accepts a `prompt` string, sends it through the provider as an
 * independent conversation, and returns the assistant's text response
 * as the tool result. The `description` and `subagent_type` fields
 * are accepted but not used in this initial implementation.
 */
export class TaskExecutor implements ToolExecutor {
  private _provider: Provider;
  private _systemPrompt: string | null;

  constructor(provider: Provider, systemPrompt?: string | null) {
    this._provider = provider;
    this._systemPrompt = systemPrompt ?? null;
  }

  async execute(
    input: Record<string, unknown>,
    _context: ToolContext,
  ): Promise<ToolResult> {
    const prompt = input.prompt as string;
    if (!prompt) {
      return { content: 'Error: "prompt" is required', isError: true };
    }

    const description = (input.description as string) || 'sub-agent task';
    log.info(`TaskExecutor: starting sub-agent — ${description}`);

    const messages: ProviderMessage[] = [
      { role: 'user', content: prompt },
    ];

    const options: PromptOptions = {};
    if (this._systemPrompt) {
      options.systemPrompt = this._systemPrompt;
    }

    let responseText = '';
    try {
      const stream = this._provider.sendPrompt(messages, options);
      for await (const event of stream) {
        if (event.type === 'text_delta') {
          responseText += event.text;
        }
        if (event.type === 'error') {
          log.error(`TaskExecutor: sub-agent error — ${event.error.message}`);
          return { content: `Sub-agent error: ${event.error.message}`, isError: true };
        }
        if (event.type === 'message_complete') {
          break;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error(`TaskExecutor: sub-agent threw — ${msg}`);
      return { content: `Sub-agent error: ${msg}`, isError: true };
    }

    log.info(`TaskExecutor: sub-agent completed — ${responseText.length} chars`);
    return {
      content: responseText || '(empty response)',
      isError: false,
    };
  }
}
