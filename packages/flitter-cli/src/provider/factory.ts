// Provider factory — creates provider instances via @mariozechner/pi-ai.
//
// Thin adapter: resolves Model from pi-ai catalog, applies baseUrl/id overrides,
// loads OAuth tokens from token-store, and wraps everything in PiAiProvider.

import { getModel, getModels, getProviders, getEnvApiKey } from '@mariozechner/pi-ai';
import type { Model, Api, KnownProvider } from '@mariozechner/pi-ai';
import type { Provider, ProviderConfig, ProviderId } from './provider';
import { PiAiProvider } from './pi-ai-provider';
import { loadToken, hasValidToken } from '../auth/token-store';
import { log } from '../utils/logger';

/**
 * Backwards-compatible aliases for provider IDs that don't match pi-ai names.
 * Only entries where the flitter-cli name differs from the pi-ai KnownProvider.
 */
const PROVIDER_ALIASES: Record<string, string> = {
  'gemini': 'google',
  'vertex': 'google-vertex',
  'moonshot': 'kimi-coding',
  'chatgpt-codex': 'openai-codex',
  'copilot': 'github-copilot',
  'antigravity': 'google-antigravity',
  'openai-compatible': 'openai',
  'fireworks': 'openai',
  'baseten': 'openai',
};

/**
 * Resolve the pi-ai KnownProvider key for a given provider ID.
 * Handles both pi-ai native names and flitter-cli legacy aliases.
 */
function toPiAiProvider(providerId: string): string {
  return PROVIDER_ALIASES[providerId] ?? providerId;
}

/**
 * Display names for providers that need special casing.
 * Everything else: capitalize the pi-ai provider key.
 */
const DISPLAY_NAMES: Record<string, string> = {
  'anthropic': 'Anthropic',
  'openai': 'OpenAI',
  'xai': 'xAI',
  'openrouter': 'OpenRouter',
  'openai-codex': 'ChatGPT / Codex',
  'chatgpt-codex': 'ChatGPT / Codex',
  'github-copilot': 'GitHub Copilot',
  'copilot': 'GitHub Copilot',
  'google-antigravity': 'Antigravity (Gemini)',
  'antigravity': 'Antigravity (Gemini)',
  'google': 'Google Gemini',
  'gemini': 'Google Gemini',
  'google-vertex': 'Google Vertex',
  'vertex': 'Google Vertex',
  'openai-compatible': 'OpenAI-Compatible',
  'kimi-coding': 'Moonshot (Kimi)',
  'moonshot': 'Moonshot (Kimi)',
};

/**
 * Derive a human-readable display name for any provider.
 */
function getDisplayName(providerId: string): string {
  if (DISPLAY_NAMES[providerId]) return DISPLAY_NAMES[providerId];
  return providerId.charAt(0).toUpperCase() + providerId.slice(1);
}

/**
 * Get the default model ID for a provider from pi-ai's catalog.
 * Returns the first available model, or a hardcoded fallback.
 */
export function getDefaultModel(providerId: string): string {
  try {
    const models = getModels(toPiAiProvider(providerId) as KnownProvider);
    if (models.length > 0) return models[0].id;
  } catch { /* provider not in catalog */ }
  return 'claude-sonnet-4-20250514';
}

/**
 * Create a Provider instance from the given configuration using pi-ai.
 *
 * OAuth providers (chatgpt-codex/openai-codex, copilot/github-copilot, antigravity/google-antigravity)
 * load tokens from disk and pass the access token as the API key.
 * Throws if credentials are missing.
 */
export function createProvider(config: ProviderConfig): Provider {
  log.info(`createProvider: provider='${config.id}' model=${config.model ?? 'default'}`);

  const providerId = config.id;
  const modelId = config.model ?? getDefaultModel(providerId);

  // Resolve API key by priority: explicit → OAuth token-store → pi-ai env detection
  let apiKey: string | undefined = config.apiKey;

  if (!apiKey) {
    switch (providerId) {
      case 'chatgpt-codex':
      case 'openai-codex': {
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

      case 'copilot':
      case 'github-copilot': {
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

      case 'antigravity':
      case 'google-antigravity': {
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
        apiKey = getEnvApiKey(toPiAiProvider(providerId) as KnownProvider);
        break;
    }
  }

  if (!apiKey) {
    throw new Error(
      `No API key found for provider '${providerId}'.\n` +
      `Set the corresponding environment variable or run: flitter-cli --connect ${providerId}`,
    );
  }

  // Resolve pi-ai Model object — try exact match, then fall back to first available
  const piProvider = toPiAiProvider(providerId);
  let model: Model<Api>;
  try {
    model = getModel(piProvider as KnownProvider, modelId as Parameters<typeof getModel>[1]);
  } catch {
    log.warn(`createProvider: model '${modelId}' not in pi-ai catalog for '${piProvider}', using first available`);
    try {
      const available = getModels(piProvider as KnownProvider);
      if (available.length === 0) {
        throw new Error(`No models available for provider '${piProvider}'`);
      }
      model = available[0];
    } catch (e) {
      throw new Error(`Cannot resolve model '${modelId}' for provider '${providerId}': ${e}`);
    }
  }

  // Custom baseUrl override — for OpenAI-compatible proxies (Volcano Engine Ark, LiteLLM, vLLM)
  if (config.baseUrl) {
    model = { ...model, id: modelId as typeof model.id, baseUrl: config.baseUrl };
    log.info(`createProvider: baseUrl override → ${config.baseUrl}, model id → ${modelId}`);
  }

  // Antigravity requires User-Agent header spoofing
  let headers: Record<string, string> | undefined = config.headers;
  if (providerId === 'antigravity' || providerId === 'google-antigravity') {
    headers = { 'User-Agent': 'antigravity/1.15.8', ...headers };
  }

  const displayName = getDisplayName(providerId);
  log.info(`createProvider: resolved model '${model.id}' (${model.name}) for '${displayName}'`);

  return new PiAiProvider(model, providerId as ProviderId, displayName, apiKey, headers);
}

/**
 * Auto-detect the best available provider from environment variables and stored tokens.
 *
 * Iterates pi-ai's known providers via getEnvApiKey(), then checks OAuth token-store.
 */
export function autoDetectProvider(): ProviderConfig | null {
  for (const p of getProviders()) {
    const key = getEnvApiKey(p);
    if (key) {
      log.info(`autoDetectProvider: found env key for '${p}'`);
      return { id: p as ProviderId, apiKey: key };
    }
  }

  if (hasValidToken('chatgpt-codex')) return { id: 'openai-codex' as ProviderId };
  if (hasValidToken('copilot')) return { id: 'github-copilot' as ProviderId };
  if (hasValidToken('antigravity')) return { id: 'google-antigravity' as ProviderId };

  return null;
}
