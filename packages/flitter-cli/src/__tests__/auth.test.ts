import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  generateCodeVerifier,
  computeCodeChallenge,
  generateState,
} from '../auth/pkce';

// ---------------------------------------------------------------------------
// PKCE utilities
// ---------------------------------------------------------------------------

describe('PKCE utilities', () => {
  describe('generateCodeVerifier', () => {
    it('returns a string of 43-128 characters', () => {
      const verifier = generateCodeVerifier();
      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(verifier.length).toBeLessThanOrEqual(128);
    });

    it('only contains unreserved characters', () => {
      const verifier = generateCodeVerifier();
      // RFC 7636: unreserved characters = ALPHA / DIGIT / "-" / "." / "_" / "~"
      expect(verifier).toMatch(/^[a-zA-Z0-9\-._~]+$/);
    });

    it('generates unique values each call', () => {
      const a = generateCodeVerifier();
      const b = generateCodeVerifier();
      expect(a).not.toBe(b);
    });
  });

  describe('computeCodeChallenge', () => {
    it('returns a base64url string (no padding)', () => {
      const verifier = generateCodeVerifier();
      const challenge = computeCodeChallenge(verifier);
      // SHA-256 → 32 bytes → base64url = 43 chars (no padding)
      expect(challenge.length).toBe(43);
      expect(challenge).toMatch(/^[a-zA-Z0-9_-]+$/);
    });

    it('is deterministic for the same verifier', () => {
      const verifier = 'test-verifier-string-12345';
      const a = computeCodeChallenge(verifier);
      const b = computeCodeChallenge(verifier);
      expect(a).toBe(b);
    });

    it('produces different challenges for different verifiers', () => {
      const a = computeCodeChallenge('verifier-aaa');
      const b = computeCodeChallenge('verifier-bbb');
      expect(a).not.toBe(b);
    });
  });

  describe('generateState', () => {
    it('returns a 32-character hex string', () => {
      const state = generateState();
      expect(state.length).toBe(32);
      expect(state).toMatch(/^[0-9a-f]+$/);
    });

    it('generates unique values each call', () => {
      const a = generateState();
      const b = generateState();
      expect(a).not.toBe(b);
    });
  });
});

// ---------------------------------------------------------------------------
// Token store
// ---------------------------------------------------------------------------

describe('Token store', () => {
  // We need to mock homedir() since token-store uses it internally.
  // Instead, we'll test the token store by importing and directly testing
  // the functions, using the actual ~/.flitter-cli/auth/ dir but with
  // a test-specific provider name that won't conflict.

  const TEST_PROVIDER = '__test_provider_' + Date.now();

  afterEach(() => {
    // Clean up test token
    const { join: pathJoin } = require('node:path');
    const { homedir: getHome } = require('node:os');
    const { rmSync: rm } = require('node:fs');
    const testPath = pathJoin(getHome(), '.flitter-cli', 'auth', `${TEST_PROVIDER}.json`);
    try { rm(testPath, { force: true }); } catch { /* ignore */ }
  });

  it('saveToken and loadToken round-trip', async () => {
    const { saveToken, loadToken } = await import('../auth/token-store');

    const token = {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresAt: Date.now() + 3600_000,
      storedAt: Date.now(),
    };

    saveToken(TEST_PROVIDER, token);
    const loaded = loadToken(TEST_PROVIDER);

    expect(loaded).not.toBeNull();
    expect(loaded!.accessToken).toBe('test-access-token');
    expect(loaded!.refreshToken).toBe('test-refresh-token');
    expect(loaded!.expiresAt).toBe(token.expiresAt);
  });

  it('loadToken returns null for unknown provider', async () => {
    const { loadToken } = await import('../auth/token-store');
    const loaded = loadToken('__nonexistent_provider__');
    expect(loaded).toBeNull();
  });

  it('hasValidToken returns true for non-expired token', async () => {
    const { saveToken, hasValidToken } = await import('../auth/token-store');

    saveToken(TEST_PROVIDER, {
      accessToken: 'valid',
      expiresAt: Date.now() + 3600_000,
      storedAt: Date.now(),
    });

    expect(hasValidToken(TEST_PROVIDER)).toBe(true);
  });

  it('hasValidToken returns false for expired token', async () => {
    const { saveToken, hasValidToken } = await import('../auth/token-store');

    saveToken(TEST_PROVIDER, {
      accessToken: 'expired',
      expiresAt: Date.now() - 1000, // Already expired
      storedAt: Date.now() - 3600_000,
    });

    expect(hasValidToken(TEST_PROVIDER)).toBe(false);
  });

  it('hasValidToken returns false for unknown provider', async () => {
    const { hasValidToken } = await import('../auth/token-store');
    expect(hasValidToken('__nonexistent_provider__')).toBe(false);
  });

  it('hasValidToken returns true for token without expiresAt', async () => {
    const { saveToken, hasValidToken } = await import('../auth/token-store');

    saveToken(TEST_PROVIDER, {
      accessToken: 'no-expiry',
      storedAt: Date.now(),
    });

    expect(hasValidToken(TEST_PROVIDER)).toBe(true);
  });

  it('loadToken returns expired token (caller can refresh)', async () => {
    const { saveToken, loadToken } = await import('../auth/token-store');

    saveToken(TEST_PROVIDER, {
      accessToken: 'old-token',
      refreshToken: 'refresh-me',
      expiresAt: Date.now() - 1000,
      storedAt: Date.now() - 7200_000,
    });

    const loaded = loadToken(TEST_PROVIDER);
    // loadToken returns expired tokens — the caller decides whether to refresh
    expect(loaded).not.toBeNull();
    expect(loaded!.accessToken).toBe('old-token');
    expect(loaded!.refreshToken).toBe('refresh-me');
  });

  it('saveToken stores accountId', async () => {
    const { saveToken, loadToken } = await import('../auth/token-store');

    saveToken(TEST_PROVIDER, {
      accessToken: 'tok',
      accountId: 'https://copilot-proxy.example.com',
      storedAt: Date.now(),
    });

    const loaded = loadToken(TEST_PROVIDER);
    expect(loaded).not.toBeNull();
    expect(loaded!.accountId).toBe('https://copilot-proxy.example.com');
  });
});

// ---------------------------------------------------------------------------
// Config --connect flag
// ---------------------------------------------------------------------------

describe('parseArgs --connect', () => {
  it('parses --connect chatgpt', () => {
    const { parseArgs } = require('../state/config');
    const config = parseArgs(['bun', 'index.ts', '--connect', 'chatgpt']);
    expect(config.connectTarget).toBe('chatgpt');
  });

  it('parses --connect copilot', () => {
    const { parseArgs } = require('../state/config');
    const config = parseArgs(['bun', 'index.ts', '--connect', 'copilot']);
    expect(config.connectTarget).toBe('copilot');
  });

  it('parses --connect antigravity', () => {
    const { parseArgs } = require('../state/config');
    const config = parseArgs(['bun', 'index.ts', '--connect', 'antigravity']);
    expect(config.connectTarget).toBe('antigravity');
  });

  it('connectTarget is null when --connect is not specified', () => {
    const { parseArgs } = require('../state/config');
    const config = parseArgs(['bun', 'index.ts']);
    expect(config.connectTarget).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Provider factory
// ---------------------------------------------------------------------------

describe('Provider factory', () => {
  it('creates anthropic provider with API key', () => {
    const { createProvider } = require('../provider/factory');
    const provider = createProvider({ id: 'anthropic', apiKey: 'test-key', model: 'claude-sonnet-4-20250514' });
    expect(provider.id).toBe('anthropic');
    expect(provider.model).toBe('claude-sonnet-4-20250514');
  });

  it('creates openai provider with API key', () => {
    const { createProvider } = require('../provider/factory');
    const provider = createProvider({ id: 'openai', apiKey: 'test-key', model: 'gpt-4o' });
    expect(provider.id).toBe('openai');
    expect(provider.model).toBe('gpt-4o');
  });

  it('creates openai-compatible provider', () => {
    const { createProvider } = require('../provider/factory');
    const provider = createProvider({
      id: 'openai-compatible',
      apiKey: 'test-key',
      model: 'llama-3',
      baseUrl: 'http://localhost:11434/v1',
    });
    expect(provider.id).toBe('openai-compatible');
    expect(provider.name).toBe('OpenAI-Compatible');
  });

  it('creates gemini provider with API key', () => {
    const { createProvider } = require('../provider/factory');
    const provider = createProvider({ id: 'gemini', apiKey: 'test-gemini-key', model: 'gemini-2.0-flash' });
    expect(provider.id).toBe('gemini');
    expect(provider.name).toBe('Google Gemini');
  });

  it('throws for gemini without API key', () => {
    const { createProvider } = require('../provider/factory');
    expect(() => createProvider({ id: 'gemini' })).toThrow('Gemini requires an API key');
  });

  it('throws for unknown provider', () => {
    const { createProvider } = require('../provider/factory');
    expect(() => createProvider({ id: 'nonexistent' })).toThrow("Unknown provider: 'nonexistent'");
  });

  it('DEFAULT_MODELS has entries for all built-in providers', () => {
    const { DEFAULT_MODELS } = require('../provider/factory');
    expect(DEFAULT_MODELS['anthropic']).toBeDefined();
    expect(DEFAULT_MODELS['openai']).toBeDefined();
    expect(DEFAULT_MODELS['chatgpt-codex']).toBeDefined();
    expect(DEFAULT_MODELS['copilot']).toBeDefined();
    expect(DEFAULT_MODELS['gemini']).toBeDefined();
    expect(DEFAULT_MODELS['antigravity']).toBeDefined();
    expect(DEFAULT_MODELS['openai-compatible']).toBeDefined();
  });
});
