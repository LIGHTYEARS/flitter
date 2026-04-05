// Tool registry tests — verifies registration, lookup, and definition retrieval.

import { describe, test, expect } from 'bun:test';
import { ToolRegistry } from '../tools/registry';
import { createDefaultRegistry } from '../tools/defaults';
import type { RegisteredTool, ToolResult, ToolContext } from '../tools/executor';
import type { ToolDefinition } from '../state/types';

describe('ToolRegistry', () => {
  function makeTool(name: string, requiresPermission = false): RegisteredTool {
    return {
      definition: {
        name,
        description: `Test tool: ${name}`,
        input_schema: { type: 'object', properties: {}, required: [] },
      },
      executor: {
        async execute(): Promise<ToolResult> {
          return { content: `${name} result` };
        },
      },
      requiresPermission,
    };
  }

  test('register and retrieve a tool', () => {
    const registry = new ToolRegistry();
    const tool = makeTool('TestTool');
    registry.register(tool);

    expect(registry.has('TestTool')).toBe(true);
    expect(registry.get('TestTool')).toBe(tool);
    expect(registry.size).toBe(1);
  });

  test('getExecutor returns the executor', () => {
    const registry = new ToolRegistry();
    const tool = makeTool('TestTool');
    registry.register(tool);

    expect(registry.getExecutor('TestTool')).toBe(tool.executor);
  });

  test('getExecutor returns undefined for unknown tool', () => {
    const registry = new ToolRegistry();
    expect(registry.getExecutor('Unknown')).toBeUndefined();
  });

  test('requiresPermission returns correct values', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool('SafeTool', false));
    registry.register(makeTool('DangerousTool', true));

    expect(registry.requiresPermission('SafeTool')).toBe(false);
    expect(registry.requiresPermission('DangerousTool')).toBe(true);
  });

  test('requiresPermission defaults to true for unknown tools', () => {
    const registry = new ToolRegistry();
    expect(registry.requiresPermission('Unknown')).toBe(true);
  });

  test('getDefinitions returns all registered definitions', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool('Alpha'));
    registry.register(makeTool('Beta'));
    registry.register(makeTool('Gamma'));

    const defs = registry.getDefinitions();
    expect(defs).toHaveLength(3);

    const names = defs.map(d => d.name);
    expect(names).toContain('Alpha');
    expect(names).toContain('Beta');
    expect(names).toContain('Gamma');
  });

  test('getNames returns all tool names', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool('A'));
    registry.register(makeTool('B'));

    const names = registry.getNames();
    expect(names).toContain('A');
    expect(names).toContain('B');
  });

  test('register overwrites existing tool', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool('Tool'));
    const replacement = makeTool('Tool', true);
    registry.register(replacement);

    expect(registry.size).toBe(1);
    expect(registry.get('Tool')).toBe(replacement);
    expect(registry.requiresPermission('Tool')).toBe(true);
  });
});

describe('createDefaultRegistry', () => {
  test('creates registry with all core tools', () => {
    const registry = createDefaultRegistry();

    expect(registry.size).toBe(8);
    expect(registry.has('Bash')).toBe(true);
    expect(registry.has('Read')).toBe(true);
    expect(registry.has('Write')).toBe(true);
    expect(registry.has('Edit')).toBe(true);
    expect(registry.has('Grep')).toBe(true);
    expect(registry.has('Glob')).toBe(true);
    expect(registry.has('TodoWrite')).toBe(true);
    expect(registry.has('Task')).toBe(true);
  });

  test('core tool definitions have valid schemas', () => {
    const registry = createDefaultRegistry();
    const defs = registry.getDefinitions();

    for (const def of defs) {
      expect(def.name).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.input_schema).toBeDefined();
      expect(def.input_schema.type).toBe('object');
      expect(def.input_schema.properties).toBeDefined();
    }
  });

  test('permission requirements are correctly set', () => {
    const registry = createDefaultRegistry();

    // These tools need permission (destructive operations)
    expect(registry.requiresPermission('Bash')).toBe(true);
    expect(registry.requiresPermission('Write')).toBe(true);
    expect(registry.requiresPermission('Edit')).toBe(true);

    // These tools are safe (read-only operations)
    expect(registry.requiresPermission('Read')).toBe(false);
    expect(registry.requiresPermission('Grep')).toBe(false);
    expect(registry.requiresPermission('Glob')).toBe(false);
    expect(registry.requiresPermission('TodoWrite')).toBe(false);
  });

  test('TodoWrite uses real executor', async () => {
    const registry = createDefaultRegistry();
    const executor = registry.getExecutor('TodoWrite');
    expect(executor).toBeDefined();

    const result = await executor!.execute({ todos: [] }, { cwd: '/tmp' });
    expect(result.isError).toBe(false);
    expect(result.content).toContain('0 total');
  });

  test('Task still uses stub executor until provider is wired', async () => {
    const registry = createDefaultRegistry();
    const executor = registry.getExecutor('Task');
    expect(executor).toBeDefined();

    const result = await executor!.execute({ prompt: 'hello' }, { cwd: '/tmp' });
    expect(result.isError).toBe(true);
    expect(result.content).toContain('not yet implemented');
  });

  test('real executors are wired for core tools', async () => {
    const registry = createDefaultRegistry();
    const executor = registry.getExecutor('Bash');
    expect(executor).toBeDefined();

    const result = await executor!.execute({ command: 'echo hello' }, { cwd: '/tmp' });
    expect(result.isError).toBeFalsy();
    expect(result.content.trim()).toBe('hello');
  });

  test('each definition has required fields', () => {
    const registry = createDefaultRegistry();
    const defs = registry.getDefinitions();

    for (const def of defs) {
      expect(typeof def.name).toBe('string');
      expect(def.name.length).toBeGreaterThan(0);
      expect(typeof def.description).toBe('string');
      expect(def.description.length).toBeGreaterThan(0);
      expect(def.input_schema.type).toBe('object');
      expect(Array.isArray(def.input_schema.required)).toBe(true);
    }
  });

  test('Bash tool schema requires command', () => {
    const registry = createDefaultRegistry();
    const bash = registry.get('Bash');
    expect(bash).toBeDefined();
    expect(bash!.definition.input_schema.required).toContain('command');
  });

  test('Read tool schema requires file_path', () => {
    const registry = createDefaultRegistry();
    const read = registry.get('Read');
    expect(read).toBeDefined();
    expect(read!.definition.input_schema.required).toContain('file_path');
  });

  test('Edit tool schema requires file_path, old_string, new_string', () => {
    const registry = createDefaultRegistry();
    const edit = registry.get('Edit');
    expect(edit).toBeDefined();
    const required = edit!.definition.input_schema.required!;
    expect(required).toContain('file_path');
    expect(required).toContain('old_string');
    expect(required).toContain('new_string');
  });
});
