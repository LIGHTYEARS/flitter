// Provider factory — creates provider instances from configuration.
//
// Routes provider creation based on the provider ID in config.
// Supports:
// - API-key-based: Anthropic, OpenAI, OpenAI-compatible
// - OAuth-based: ChatGPT/Codex, Copilot, Antigravity/Gemini

import type { Provider, ProviderConfig, ProviderId } from './provider';
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';
import { loadToken, hasValidToken } from '../auth/token-store';
import { GEMINI_OPENAI_BASE_URL } from '../auth/antigravity-oauth';
import { log } from '../utils/logger';

/**
 * Create a Provider instance from the given configuration.
 *
 * Routes based on config.id to the correct backend implementation.
 * For OAuth providers, loads stored tokens or provides auth instructions.
 * Throws if credentials are missing and authentication is required.
 */
export function createProvider(config: ProviderConfig): Provider {
  log.info(`createProvider: creating provider '${config.id}' model=${config.model ?? 'default'}`);

  switch (config.id) {
    case 'anthropic':
      return new AnthropicProvider({
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl,
      });

    case 'openai':
      return new OpenAIProvider({
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl,
        headers: config.headers,
      });

    case 'openai-compatible':
      return new OpenAIProvider({
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl,
        headers: config.headers,
        providerId: 'openai-compatible',
        providerName: 'OpenAI-Compatible',
      });

    case 'chatgpt-codex': {
      // ChatGPT/Codex uses OpenAI provider with OAuth token
      const token = config.auth?.accessToken
        ? { accessToken: config.auth.accessToken }
        : loadToken('chatgpt-codex');

      if (!token) {
        throw new Error(
          'ChatGPT/Codex requires authentication.\n' +
          'Run: flitter-cli --connect chatgpt',
        );
      }

      return new OpenAIProvider({
        apiKey: token.accessToken,
        model: config.model ?? 'gpt-4o',
        baseUrl: 'https://api.openai.com/v1',
        providerId: 'chatgpt-codex',
        providerName: 'ChatGPT',
      });
    }

    case 'copilot': {
      // GitHub Copilot uses OpenAI-compatible API with Copilot token
      const token = config.auth?.accessToken
        ? { accessToken: config.auth.accessToken, accountId: config.auth.accountId }
        : loadToken('copilot');

      if (!token) {
        throw new Error(
          'GitHub Copilot requires authentication.\n' +
          'Run: flitter-cli --connect copilot',
        );
      }

      // Copilot proxy URL is stored in accountId
      const baseUrl = token.accountId ?? 'https://copilot-proxy.githubusercontent.com';

      return new OpenAIProvider({
        apiKey: token.accessToken,
        model: config.model ?? 'gpt-4o',
        baseUrl: baseUrl + '/v1',
        providerId: 'copilot',
        providerName: 'GitHub Copilot',
      });
    }

    case 'gemini': {
      // Gemini with API key — uses OpenAI-compatible endpoint
      if (config.apiKey) {
        return new OpenAIProvider({
          apiKey: config.apiKey,
          model: config.model ?? 'gemini-2.0-flash',
          baseUrl: GEMINI_OPENAI_BASE_URL,
          providerId: 'gemini',
          providerName: 'Google Gemini',
        });
      }
      throw new Error(
        'Gemini requires an API key.\n' +
        'Set: export GEMINI_API_KEY=your-key\n' +
        'Or use: flitter-cli --connect antigravity (for Google account auth)',
      );
    }

    case 'antigravity': {
      // Antigravity uses Google OAuth → Gemini OpenAI-compatible endpoint
      const token = config.auth?.accessToken
        ? { accessToken: config.auth.accessToken }
        : loadToken('antigravity');

      if (!token) {
        throw new Error(
          'Antigravity (Google Gemini) requires authentication.\n' +
          'Run: flitter-cli --connect antigravity',
        );
      }

      return new OpenAIProvider({
        apiKey: token.accessToken,
        model: config.model ?? 'gemini-2.0-flash',
        baseUrl: GEMINI_OPENAI_BASE_URL,
        providerId: 'antigravity',
        providerName: 'Antigravity (Gemini)',
        headers: {
          // Antigravity User-Agent spoofing for model allowlist
          'User-Agent': 'antigravity/1.15.8',
        },
      });
    }

    default:
      throw new Error(`Unknown provider: '${config.id}'`);
  }
}

/**
 * Auto-detect the best available provider based on environment variables.
 * Also checks for stored OAuth tokens.
 *
 * Priority order:
 * 1. Anthropic (ANTHROPIC_API_KEY)
 * 2. OpenAI (OPENAI_API_KEY)
 * 3. Gemini (GEMINI_API_KEY / GOOGLE_API_KEY)
 * 4. OpenAI-compatible (OPENAI_BASE_URL + OPENAI_API_KEY)
 * 5. ChatGPT/Codex (stored OAuth token)
 * 6. Copilot (stored OAuth token)
 * 7. Antigravity (stored OAuth token)
 */
export function autoDetectProvider(): ProviderConfig | null {
  // 1. Anthropic
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    return { id: 'anthropic', apiKey: anthropicKey };
  }

  // 2. OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const baseUrl = process.env.OPENAI_BASE_URL;
    if (baseUrl && !baseUrl.includes('api.openai.com')) {
      return { id: 'openai-compatible', apiKey: openaiKey, baseUrl };
    }
    return { id: 'openai', apiKey: openaiKey };
  }

  // 3. Gemini
  const geminiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (geminiKey) {
    return { id: 'gemini', apiKey: geminiKey };
  }

  // 4. ChatGPT/Codex (stored token)
  if (hasValidToken('chatgpt-codex')) {
    return { id: 'chatgpt-codex' };
  }

  // 5. Copilot (stored token)
  if (hasValidToken('copilot')) {
    return { id: 'copilot' };
  }

  // 6. Antigravity (stored token)
  if (hasValidToken('antigravity')) {
    return { id: 'antigravity' };
  }

  return null;
}

/** Map of well-known provider IDs to their default models. */
export const DEFAULT_MODELS: Record<string, string> = {
  'anthropic': 'claude-sonnet-4-20250514',
  'openai': 'gpt-4o',
  'chatgpt-codex': 'gpt-4o',
  'copilot': 'gpt-4o',
  'gemini': 'gemini-2.0-flash',
  'antigravity': 'gemini-2.0-flash',
  'openai-compatible': 'gpt-4o',
};
