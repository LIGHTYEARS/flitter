// Fixture loader for Agent Test.
//
// Loads seed configs from seeds/ directory and uses builders to generate
// full fixture data. Caches built fixtures per session for efficiency.

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { buildSessionItems, buildStreamEvents } from './builders';
import type { SessionSeed, StreamSeed, SessionItem, StreamEventFixture } from './builders';

const SEEDS_DIR = join(import.meta.dir, 'seeds');

/** Cache to avoid rebuilding the same fixture multiple times. */
const sessionCache = new Map<string, SessionItem[]>();
const streamCache = new Map<string, StreamEventFixture[]>();

/**
 * Load a session fixture by name (filename without extension).
 * Reads the seed JSON from seeds/ and builds full session items.
 */
export function loadSessionFixture(name: string): SessionItem[] {
  if (sessionCache.has(name)) return sessionCache.get(name)!;

  const seedPath = join(SEEDS_DIR, `${name}.json`);
  if (!existsSync(seedPath)) {
    throw new Error(`Session fixture seed not found: ${seedPath}`);
  }

  const seed: SessionSeed = JSON.parse(readFileSync(seedPath, 'utf-8'));
  const items = buildSessionItems(seed);
  sessionCache.set(name, items);
  return items;
}

/**
 * Load a stream fixture by name (filename without extension).
 * Reads the seed JSON from seeds/ and builds full stream events.
 */
export function loadStreamFixture(name: string): StreamEventFixture[] {
  if (streamCache.has(name)) return streamCache.get(name)!;

  const seedPath = join(SEEDS_DIR, `${name}.json`);
  if (!existsSync(seedPath)) {
    throw new Error(`Stream fixture seed not found: ${seedPath}`);
  }

  const seed: StreamSeed = JSON.parse(readFileSync(seedPath, 'utf-8'));
  const events = buildStreamEvents(seed);
  streamCache.set(name, events);
  return events;
}

/**
 * List all available fixture seeds.
 */
export function listFixtures(): { sessions: string[]; streams: string[] } {
  const files = existsSync(SEEDS_DIR) ? readdirSync(SEEDS_DIR).filter(f => f.endsWith('.json')) : [];
  const sessions: string[] = [];
  const streams: string[] = [];

  for (const file of files) {
    const content = JSON.parse(readFileSync(join(SEEDS_DIR, file), 'utf-8'));
    const name = basename(file, '.json');
    if ('turns' in content) sessions.push(name);
    else if ('type' in content) streams.push(name);
  }

  return { sessions, streams };
}

/** Clear fixture caches (useful between test runs). */
export function clearFixtureCache(): void {
  sessionCache.clear();
  streamCache.clear();
}
