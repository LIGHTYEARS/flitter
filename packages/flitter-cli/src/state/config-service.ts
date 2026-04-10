import { z } from 'zod';
import { log } from '../utils/logger';

/**
 * Zod schema for provider-specific settings matching AMP xPR settings list.
 *
 * Covers all 15 known AMP settings keys:
 *   agent.deepReasoningEffort, agent.skipTitleGenerationIfMessageContains,
 *   anthropic.effort, anthropic.interleavedThinking.enabled, anthropic.provider,
 *   anthropic.speed, anthropic.temperature, anthropic.thinking.enabled,
 *   gemini.thinkingLevel, internal.compactionThresholdPercent, internal.model,
 *   internal.oracleReasoningEffort, openai.speed, tools.disable, tools.enable
 */
export const settingsSchema = z.object({
  // Agent-level settings
  'agent.deepReasoningEffort': z.enum(['medium', 'high', 'xhigh']).optional(),
  'agent.skipTitleGenerationIfMessageContains': z.string().optional(),

  // Anthropic provider settings
  'anthropic.effort': z.enum(['medium', 'high', 'xhigh']).optional(),
  'anthropic.interleavedThinking.enabled': z.boolean().optional(),
  'anthropic.provider': z.enum(['anthropic', 'vertex']).optional(),
  'anthropic.speed': z.enum(['standard', 'fast']).optional(),
  'anthropic.temperature': z.number().optional(),
  'anthropic.thinking.enabled': z.boolean().optional(),

  // OpenAI provider settings
  'openai.speed': z.enum(['standard', 'fast']).optional(),

  // Gemini provider settings
  'gemini.thinkingLevel': z.enum(['minimal', 'low', 'medium', 'high']).optional(),

  // Internal settings
  'internal.model': z.union([z.string(), z.record(z.string(), z.string())]).optional(),
  'internal.compactionThresholdPercent': z.number().min(0).max(100).optional(),
  'internal.oracleReasoningEffort': z.enum(['medium', 'high', 'xhigh']).optional(),

  // Tool permission settings
  'tools.disable': z.array(z.string()).optional(),
  'tools.enable': z.array(z.string()).optional(),
}).strict();

export type Settings = z.infer<typeof settingsSchema>;
export type SettingsKey = keyof Settings;

// ---------------------------------------------------------------------------
// Default values for settings that have well-known defaults
// ---------------------------------------------------------------------------

/** Default values for settings keys. Only keys with documented defaults are listed. */
export const SETTINGS_DEFAULTS: Partial<Settings> = {
  'internal.compactionThresholdPercent': 80,
  'anthropic.interleavedThinking.enabled': false,
  'anthropic.effort': 'high',
  'openai.speed': 'standard',
};

/**
 * ConfigService provides typed, validated access to provider-specific settings
 * Supports dot-notation get/set, bulk loading, and schema validation
 */
export class ConfigService {
  private _settings: Partial<Settings> = {};

  constructor(initial?: Partial<Settings>) {
    if (initial) {
      this.load(initial);
    }
  }

  /**
   * Get a typed setting value by dot-notation key
   * @param key Setting key to retrieve
   * @returns Setting value or undefined if not set
   */
  get<K extends SettingsKey>(key: K): Settings[K] | undefined {
    return this._settings[key] as Settings[K] | undefined;
  }

  /**
   * Get a typed setting value with a fallback to the documented default.
   * First checks explicitly set values, then falls back to SETTINGS_DEFAULTS,
   * and finally returns the provided fallback or undefined.
   *
   * @param key Setting key to retrieve
   * @param fallback Optional fallback if neither explicit nor default exists
   * @returns Setting value, default, or fallback
   */
  getWithDefault<K extends SettingsKey>(key: K, fallback?: Settings[K]): Settings[K] | undefined {
    const explicit = this._settings[key] as Settings[K] | undefined;
    if (explicit !== undefined) return explicit;
    const defaultVal = SETTINGS_DEFAULTS[key] as Settings[K] | undefined;
    if (defaultVal !== undefined) return defaultVal;
    return fallback;
  }

  /**
   * Set a setting value. Validates against the Zod schema for that key.
   * Throws descriptive error on invalid value.
   * @param key Setting key to set
   * @param value Value to set for the key
   */
  set<K extends SettingsKey>(key: K, value: Settings[K]): void {
    const partial = { [key]: value };
    const result = settingsSchema.partial().safeParse(partial);
    
    if (!result.success) {
      const msg = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new Error(`Invalid setting "${key}": ${msg}`);
    }

    this._settings[key] = value;
    log.debug(`ConfigService.set: ${key} = ${JSON.stringify(value)}`);
  }

  /**
   * Load settings from a partial object. Validates all keys.
   * Warns on invalid keys but loads all valid ones.
   * @param settings Partial settings object to load
   */
  load(settings: Record<string, unknown>): void {
    const result = settingsSchema.partial().safeParse(settings);
    
    if (!result.success) {
      const msg = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
      log.warn(`ConfigService.load: invalid settings ignored: ${msg}`);
      
      // Load only valid keys
      for (const [key, value] of Object.entries(settings)) {
        try {
          this.set(key as SettingsKey, value as any);
        } catch {
          // Skip invalid keys silently (already warned above)
        }
      }
      return;
    }

    Object.assign(this._settings, result.data);
  }

  /**
   * Return a snapshot of all current settings as a plain object
   * @returns Copy of current settings
   */
  snapshot(): Partial<Settings> {
    return { ...this._settings };
  }

  /**
   * Check if a setting is explicitly configured
   * @param key Setting key to check
   * @returns True if setting exists, false otherwise
   */
  has(key: SettingsKey): boolean {
    return this._settings[key] !== undefined;
  }

  /**
   * Delete a setting (reset to unconfigured)
   * @param key Setting key to delete
   */
  delete(key: SettingsKey): void {
    delete this._settings[key];
  }
}
