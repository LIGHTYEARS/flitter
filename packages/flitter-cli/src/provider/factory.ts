// Provider factory — creates provider instances via @mariozechner/pi-ai.
//
// Per D-00, D-02, D-04, D-14, D-16: replaces the hand-rolled AnthropicProvider/
// OpenAIProvider dispatch with a unified pi-ai backend. All provider protocol
// differences, model resolution, and streaming are handled by pi-ai.
//
// OAuth providers (chatgpt-codex, copilot, antigravity) still load tokens from
// token-store and pass them as API keys to pi-ai's stream().

import { getModel, getModels, getProviders, getEnvApiKey } from '@mariozechner/pi-ai';
import type { Model, Api, KnownProvider } from '@mariozechner/pi-ai';
import type { Provider, ProviderConfig, ProviderId } from './provider';
import { PiAiProvider } from './pi-ai-provider';
import { loadToken, hasValidToken } from '../auth/token-store';
import { log } from '../utils/logger';

/**
 * Maps flitter-cli ProviderId to pi-ai KnownProvider string.
 * Per D-02: unified provider mapping.
 */
const PROVIDER_MAP: Record<string, string> = {
  'anthropic': 'anthropic',
  'openai': 'openai',
  'xai': 'xai',
  'groq': 'groq',
  'cerebras': 'cerebras',
  'fireworks': 'openai', // fireworks uses openai-compatible API
  'openrouter': 'openrouter',
  'moonshot': 'kimi-coding',
  'vertex': 'google-vertex',
  'baseten': 'openai', // baseten uses openai-compatible API
  'gemini': 'google',
  'chatgpt-codex': 'openai-codex',
  'copilot': 'github-copilot',
  'antigravity': 'google-antigravity',
  'openai-compatible': 'openai',
};

/**
 * Reverse map: pi-ai KnownProvider → preferred flitter-cli ProviderId.
 * Used by autoDetectProvider() to convert pi-ai provider names back to
 * flitter-cli IDs.
 */
const REVERSE_PROVIDER_MAP: Record<string, string> = {
  'anthropic': 'anthropic',
  'openai': 'openai',
  'xai': 'xai',
  'groq': 'groq',
  'cerebras': 'cerebras',
  'openrouter': 'openrouter',
  'kimi-coding': 'moonshot',
  'google-vertex': 'vertex',
  'google': 'gemini',
  'openai-codex': 'chatgpt-codex',
  'github-copilot': 'copilot',
  'google-antigravity': 'antigravity',
  'mistral': 'mistral',
  'huggingface': 'huggingface',
  'zai': 'zai',
  'vercel-ai-gateway': 'vercel',
  'minimax': 'minimax',
  'minimax-cn': 'minimax-cn',
  'opencode': 'opencode',
  'opencode-go': 'opencode-go',
  'amazon-bedrock': 'amazon-bedrock',
  'azure-openai-responses': 'azure-openai',
  'google-gemini-cli': 'google-gemini-cli',
};

/**
 * Human-readable display names for each flitter-cli ProviderId.
 */
const PROVIDER_NAMES: Record<string, string> = {
  'anthropic': 'Anthropic',
  'openai': 'OpenAI',
  'xai': 'xAI',
  'groq': 'Groq',
  'cerebras': 'Cerebras',
  'fireworks': 'Fireworks',
  'openrouter': 'OpenRouter',
  'moonshot': 'Moonshot (Kimi)',
  'vertex': 'Google Vertex',
  'baseten': 'Baseten',
  'gemini': 'Google Gemini',
  'chatgpt-codex': 'ChatGPT / Codex',
  'copilot': 'GitHub Copilot',
  'antigravity': 'Antigravity (Gemini)',
  'openai-compatible': 'OpenAI-Compatible',
};

/**
 * Default model IDs per flitter-cli ProviderId.
 * These are verified against the pi-ai model catalog.
 * Per D-04: complete model defaults for all 15 provider IDs.
 */
export const DEFAULT_MODELS: Record<string, string> = {
  'anthropic': 'claude-sonnet-4-20250514',
  'openai': 'gpt-4o',
  'xai': 'grok-3',
  'groq': 'llama-3.3-70b-versatile',
  'cerebras': 'llama3.1-8b',
  'fireworks': 'gpt-4o',
  'openrouter': 'anthropic/claude-sonnet-4-20250514',
  'moonshot': 'k2p5',
  'vertex': 'gemini-2.0-flash',
  'baseten': 'gpt-4o',
  'gemini': 'gemini-2.0-flash',
  'chatgpt-codex': 'gpt-5.1-codex-mini',
  'copilot': 'claude-sonnet-4',
  'antigravity': 'claude-sonnet-4-5',
  'openai-compatible': 'gpt-4o',
};

/**
 * Resolve the best available model for a given pi-ai provider and desired model ID.
 *
 * Strategy:
 * 1. Try exact model ID via getModel().
 * 2. If the model ID is not in the catalog, find the closest match by prefix.
 * 3. Fall back to the first model from getModels().
 */
function resolveModel(piProviderKey: string, modelId: string): Model<Api> {
  try {
    return getModel(piProviderKey as KnownProvider, modelId as Parameters<typeof getModel>[1]);
  } catch {
    // Model not found by exact ID — try fallback strategies
    log.warn(`resolveModel: exact model '${modelId}' not found for '${piProviderKey}', searching catalog`);

    try {
      const available = getModels(piProviderKey as KnownProvider);
      if (available.length === 0) {
        throw new Error(`No models available for provider '${piProviderKey}'`);
      }

      // Try prefix match (e.g., 'grok-3' might match 'grok-3-latest')
      const prefixMatch = available.find(m =>
        m.id.startsWith(modelId) || modelId.startsWith(m.id),
      );
      if (prefixMatch) {
        log.info(`resolveModel: using prefix match '${prefixMatch.id}' for '${modelId}'`);
        return prefixMatch;
      }

      // Fall back to first available model
      log.info(`resolveModel: falling back to first model '${available[0].id}' for provider '${piProviderKey}'`);
      return available[0];
    } catch (fallbackErr) {
      throw new Error(
        `Cannot resolve model '${modelId}' for provider '${piProviderKey}': ${fallbackErr}`,
      );
    }
  }
}

/**
 * Create a Provider instance from the given configuration using pi-ai.
 *
 * Routes based on config.id through PROVIDER_MAP to the pi-ai provider key,
 * resolves the model via pi-ai's model catalog, and returns a PiAiProvider adapter.
 *
 * OAuth providers (chatgpt-codex, copilot, antigravity) load tokens from disk
 * and pass the access token as the API key. Throws if credentials are missing.
 */
export function createProvider(config: ProviderConfig): Provider {
  log.info(`createProvider: creating provider '${config.id}' model=${config.model ?? 'default'}`);

  // Resolve the pi-ai provider key
  const piProviderKey = PROVIDER_MAP[config.id] ?? config.id;

  // Resolve the model ID
  const modelId = config.model ?? DEFAULT_MODELS[config.id] ?? 'claude-sonnet-4-20250514';

  // Resolve API key by priority
  let apiKey: string | undefined = config.apiKey;

  // OAuth providers: load from token-store if no explicit key
  if (!apiKey) {
    switch (config.id) {
      case 'chatgpt-codex': {
        const token = config.auth?.accessToken
          ? { accessToken: config.auth.accessToken }
          : loadToken('chatgpt-codex');
        if (!token) {
          throw new Error(
            'ChatGPT/Codex requires authentication.\n' +
            'Run: flitter-cli --connect chatgpt',
          );
        }
        apiKey = token.accessToken;
        break;
      }

      case 'copilot': {
        const token = config.auth?.accessToken
          ? { accessToken: config.auth.accessToken, accountId: config.auth.accountId }
          : loadToken('copilot');
        if (!token) {
          throw new Error(
            'GitHub Copilot requires authentication.\n' +
            'Run: flitter-cli --connect copilot',
          );
        }
        apiKey = token.accessToken;
        break;
      }

      case 'antigravity': {
        const token = config.auth?.accessToken
          ? { accessToken: config.auth.accessToken }
          : loadToken('antigravity');
        if (!token) {
          throw new Error(
            'Antigravity (Google Gemini) requires authentication.\n' +
            'Run: flitter-cli --connect antigravity',
          );
        }
        apiKey = token.accessToken;
        break;
      }

      default:
        // Try pi-ai env key detection
        apiKey = getEnvApiKey(piProviderKey as KnownProvider);
        break;
    }
  }

  if (!apiKey) {
    throw new Error(
      `No API key found for provider '${config.id}'.\n` +
      `Set the corresponding environment variable or run: flitter-cli --connect ${config.id}`,
    );
  }

  // Resolve the pi-ai Model object
  const model = resolveModel(piProviderKey, modelId);

  // Determine display name
  const displayName = PROVIDER_NAMES[config.id] ?? config.id;

  // Antigravity requires User-Agent header spoofing for Google model allowlist access.
  // Merge with any config-level headers.
  let headers: Record<string, string> | undefined = config.headers;
  if (config.id === 'antigravity') {
    headers = { 'User-Agent': 'antigravity/1.15.8', ...headers };
  }

  log.info(`createProvider: resolved pi-ai model '${model.id}' (${model.name}) via provider '${piProviderKey}'`);

  return new PiAiProvider(model, config.id as ProviderId, displayName, apiKey, headers);
}

/**
 * Auto-detect the best available provider from environment variables and stored tokens.
 *
 * Uses pi-ai's getEnvApiKey() to check all known providers in order, then falls
 * back to checking stored OAuth tokens.
 *
 * Per D-16: this replaces the hand-coded env var checks with pi-ai delegation.
 */
export function autoDetectProvider(): ProviderConfig | null {
  // Check all pi-ai providers for environment API keys
  const piProviders = getProviders();
  for (const p of piProviders) {
    const key = getEnvApiKey(p);
    if (key) {
      // Map pi-ai provider back to flitter-cli ProviderId
      const flitterId = REVERSE_PROVIDER_MAP[p] ?? p;
      log.info(`autoDetectProvider: found env key for pi-ai provider '${p}' → flitter-cli '${flitterId}'`);
      return { id: flitterId as ProviderId, apiKey: key };
    }
  }

  // Check OAuth tokens (these cannot be detected via env key)
  if (hasValidToken('chatgpt-codex')) return { id: 'chatgpt-codex' };
  if (hasValidToken('copilot')) return { id: 'copilot' };
  if (hasValidToken('antigravity')) return { id: 'antigravity' };

  return null;
}
