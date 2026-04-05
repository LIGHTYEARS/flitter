// System prompt builder tests.

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  buildSystemPrompt,
  loadProjectInstructions,
} from '../provider/system-prompt';
import type { ToolDefinition } from '../state/types';

const TEST_DIR = join(tmpdir(), `flitter-sysprompt-test-${Date.now()}`);

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  try { rmSync(TEST_DIR, { recursive: true, force: true }); } catch {}
});

describe('buildSystemPrompt', () => {
  test('includes identity section', () => {
    const prompt = buildSystemPrompt({
      cwd: '/test',
      model: 'claude-sonnet',
      providerName: 'anthropic',
    });
    expect(prompt).toContain('coding assistant');
    expect(prompt).toContain('flitter-cli');
  });

  test('includes environment info', () => {
    const prompt = buildSystemPrompt({
      cwd: '/my/project',
      model: 'gpt-4o',
      providerName: 'openai',
      gitBranch: 'feature-branch',
    });
    expect(prompt).toContain('/my/project');
    expect(prompt).toContain('gpt-4o');
    expect(prompt).toContain('openai');
    expect(prompt).toContain('feature-branch');
  });

  test('includes project instructions', () => {
    const prompt = buildSystemPrompt({
      cwd: '/test',
      model: 'test',
      providerName: 'test',
      projectInstructions: 'Always use TypeScript strict mode.',
    });
    expect(prompt).toContain('Always use TypeScript strict mode');
    expect(prompt).toContain('project-instructions');
  });

  test('includes git context', () => {
    const prompt = buildSystemPrompt({
      cwd: '/test',
      model: 'test',
      providerName: 'test',
      gitLog: 'abc123 Fix bug\ndef456 Add feature',
    });
    expect(prompt).toContain('abc123 Fix bug');
    expect(prompt).toContain('git-context');
  });

  test('includes tool names', () => {
    const tools: ToolDefinition[] = [
      {
        name: 'Bash',
        description: 'Execute shell commands.',
        input_schema: { type: 'object', properties: {}, required: [] },
      },
      {
        name: 'Read',
        description: 'Read files from disk.',
        input_schema: { type: 'object', properties: {}, required: [] },
      },
    ];
    const prompt = buildSystemPrompt({
      cwd: '/test',
      model: 'test',
      providerName: 'test',
      tools,
    });
    expect(prompt).toContain('Bash');
    expect(prompt).toContain('Read');
  });

  test('includes behavioral guidelines', () => {
    const prompt = buildSystemPrompt({
      cwd: '/test',
      model: 'test',
      providerName: 'test',
    });
    expect(prompt).toContain('concise');
    expect(prompt).toContain('over-engineering');
  });
});

describe('loadProjectInstructions', () => {
  test('loads CLAUDE.md from cwd', () => {
    writeFileSync(join(TEST_DIR, 'CLAUDE.md'), '# Project Rules\nUse bun.');
    const instructions = loadProjectInstructions(TEST_DIR);
    expect(instructions).toContain('Project Rules');
    expect(instructions).toContain('Use bun');
  });

  test('returns null when no CLAUDE.md exists', () => {
    const instructions = loadProjectInstructions(TEST_DIR);
    expect(instructions).toBeNull();
  });

  test('loads from .claude subdirectory', () => {
    mkdirSync(join(TEST_DIR, '.claude'), { recursive: true });
    writeFileSync(join(TEST_DIR, '.claude', 'CLAUDE.md'), 'Hidden instructions');
    const instructions = loadProjectInstructions(TEST_DIR);
    expect(instructions).toContain('Hidden instructions');
  });

  test('skips empty CLAUDE.md', () => {
    writeFileSync(join(TEST_DIR, 'CLAUDE.md'), '   ');
    const instructions = loadProjectInstructions(TEST_DIR);
    expect(instructions).toBeNull();
  });
});
