// Phase 34 tests — I7 (graceful shutdown), I8 (capability negotiation),
// I10 (rich tool permission model).

import { describe, test, expect, beforeEach } from 'bun:test';
import type { Provider, PromptOptions, ProviderCapabilities } from '../provider/provider';
import type { StreamEvent } from '../state/types';
import type { Model, Api } from '@mariozechner/pi-ai';
import { SessionState } from '../state/session';
import { PromptHistory } from '../state/history';
import { SessionStore } from '../state/session-store';
import { AppState } from '../state/app-state';
import { PromptController } from '../state/prompt-controller';

import { ToolRegistry } from '../tools/registry';
import { createDefaultRegistry } from '../tools/defaults';
import type { RegisteredTool, ToolResult, ToolContext, PermissionLevel } from '../tools/executor';

// ---------------------------------------------------------------------------
// Mock Provider
// ---------------------------------------------------------------------------

class MockProvider implements Provider {
  readonly id = 'mock' as const;
  readonly name = 'MockProvider';
  readonly model = 'mock-model';
  readonly capabilities: ProviderCapabilities = {
    vision: true,
    functionCalling: true,
    streaming: true,
    systemPrompt: true,
  };

  /** Mock pi-ai model object for testing. */
  readonly piModel: Model<Api> = {
    id: 'test-model',
    name: 'Test Model',
    api: 'anthropic-messages' as Api,
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    reasoning: true,
    input: ['text', 'image'] as ("text" | "image")[],
    cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
    contextWindow: 200000,
    maxTokens: 8192,
  } as Model<Api>;

  mockEvents: StreamEvent[] = [];
  cancelCalled = false;
  eventDelay = 0;
  private _abort: AbortController | null = null;

  cancelRequest(): void {
    this.cancelCalled = true;
    if (this._abort) {
      this._abort.abort();
      this._abort = null;
    }
  }

  async *sendPrompt(
    _messages: Array<{ role: string; content: string }>,
    _options: PromptOptions,
  ): AsyncGenerator<StreamEvent> {
    this._abort = new AbortController();
    for (const event of this.mockEvents) {
      if (this._abort?.signal.aborted) return;
      if (this.eventDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.eventDelay));
      }
      if (this._abort?.signal.aborted) return;
      yield event;
    }
  }
}

function createTestAppState() {
  const provider = new MockProvider();
  const session = new SessionState({
    sessionId: 'test-session',
    cwd: '/test',
    model: provider.model,
  });
  const appState = new AppState(session, new PromptHistory(), new SessionStore());
  const controller = new PromptController({ session, provider });
  appState.setPromptController(controller);
  return { appState, session, provider, controller };
}

// ===========================================================================
// I7 — Graceful shutdown with in-flight cancellation
// ===========================================================================

describe('I7 — Graceful shutdown', () => {
  test('AppState has a shutdown() method', () => {
    const { appState } = createTestAppState();
    expect(typeof appState.shutdown).toBe('function');
  });

  test('shutdown() is idempotent — multiple calls are no-ops', () => {
    const { appState } = createTestAppState();
    appState.shutdown();
    appState.shutdown(); // Should not throw
    expect(appState.isShutdown).toBe(true);
  });

  test('isShutdown starts as false', () => {
    const { appState } = createTestAppState();
    expect(appState.isShutdown).toBe(false);
  });

  test('isShutdown becomes true after shutdown()', () => {
    const { appState } = createTestAppState();
    appState.shutdown();
    expect(appState.isShutdown).toBe(true);
  });

  test('shutdown() cancels in-flight prompt during processing', async () => {
    const { appState, session, provider } = createTestAppState();
    provider.mockEvents = [
      { type: 'text_delta', text: 'Hello' },
      { type: 'text_delta', text: ' world' },
      { type: 'message_complete', stopReason: 'end_turn' },
    ];
    provider.eventDelay = 100;

    // Start a prompt that will take a while
    const submitPromise = appState.submitPrompt('test');

    // Wait for processing to start, then shutdown
    await new Promise(resolve => setTimeout(resolve, 30));
    appState.shutdown();

    await submitPromise;

    // Provider's cancel should have been called
    expect(provider.cancelCalled).toBe(true);
    expect(appState.isShutdown).toBe(true);
  });

  test('shutdown() from idle state does not call cancel on provider', () => {
    const { appState, provider } = createTestAppState();
    appState.shutdown();
    expect(provider.cancelCalled).toBe(false);
    expect(appState.isShutdown).toBe(true);
  });

  test('shutdown() from complete state does not call cancel', async () => {
    const { appState, provider } = createTestAppState();
    provider.mockEvents = [
      { type: 'text_delta', text: 'Done' },
      { type: 'message_complete', stopReason: 'end_turn' },
    ];

    await appState.submitPrompt('test');
    expect(appState.lifecycle).toBe('complete');

    provider.cancelCalled = false;
    appState.shutdown();
    expect(provider.cancelCalled).toBe(false);
  });
});

// ===========================================================================
// I8 — Capability negotiation per provider
// ===========================================================================

describe('I8 — Provider capabilities', () => {
  test('ProviderCapabilities interface has the four expected fields', () => {
    const caps: ProviderCapabilities = {
      vision: true,
      functionCalling: true,
      streaming: true,
      systemPrompt: true,
    };
    expect(caps.vision).toBe(true);
    expect(caps.functionCalling).toBe(true);
    expect(caps.streaming).toBe(true);
    expect(caps.systemPrompt).toBe(true);
  });

  // Provider capability tests are now handled by pi-ai library
  // as part of the new unified provider system

  test('MockProvider has capabilities', () => {
    const provider = new MockProvider();
    expect(provider.capabilities).toBeDefined();
    expect(provider.capabilities.vision).toBe(true);
    expect(provider.capabilities.streaming).toBe(true);
  });
});

// ===========================================================================
// I10 — Rich tool permission model
// ===========================================================================

describe('I10 — Rich tool permission model', () => {
  function makeTool(name: string, opts?: {
    requiresPermission?: boolean;
    permissionLevel?: PermissionLevel;
  }): RegisteredTool {
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
      requiresPermission: opts?.requiresPermission ?? false,
      permissionLevel: opts?.permissionLevel,
    };
  }

  describe('PermissionLevel type', () => {
    test('PermissionLevel accepts auto, confirm, deny', () => {
      const levels: PermissionLevel[] = ['auto', 'confirm', 'deny'];
      expect(levels).toContain('auto');
      expect(levels).toContain('confirm');
      expect(levels).toContain('deny');
    });
  });

  describe('ToolRegistry.getPermissionLevel()', () => {
    test('returns confirm for unknown tools (conservative default)', () => {
      const registry = new ToolRegistry();
      expect(registry.getPermissionLevel('NonExistentTool')).toBe('confirm');
    });

    test('returns explicit permissionLevel when set', () => {
      const registry = new ToolRegistry();
      registry.register(makeTool('AutoTool', { permissionLevel: 'auto' }));
      registry.register(makeTool('ConfirmTool', { permissionLevel: 'confirm' }));
      registry.register(makeTool('DenyTool', { permissionLevel: 'deny' }));

      expect(registry.getPermissionLevel('AutoTool')).toBe('auto');
      expect(registry.getPermissionLevel('ConfirmTool')).toBe('confirm');
      expect(registry.getPermissionLevel('DenyTool')).toBe('deny');
    });

    test('falls back to requiresPermission when permissionLevel not set', () => {
      const registry = new ToolRegistry();
      registry.register(makeTool('SafeTool', { requiresPermission: false }));
      registry.register(makeTool('DangerTool', { requiresPermission: true }));

      expect(registry.getPermissionLevel('SafeTool')).toBe('auto');
      expect(registry.getPermissionLevel('DangerTool')).toBe('confirm');
    });

    test('permissionLevel takes precedence over requiresPermission', () => {
      const registry = new ToolRegistry();
      // requiresPermission=true but permissionLevel='auto' — permissionLevel wins
      registry.register(makeTool('OverrideTool', {
        requiresPermission: true,
        permissionLevel: 'auto',
      }));
      expect(registry.getPermissionLevel('OverrideTool')).toBe('auto');
    });
  });

  describe('ToolRegistry.setPermissionLevel()', () => {
    test('sets the permission level for a registered tool', () => {
      const registry = new ToolRegistry();
      registry.register(makeTool('TestTool', { permissionLevel: 'auto' }));

      registry.setPermissionLevel('TestTool', 'deny');
      expect(registry.getPermissionLevel('TestTool')).toBe('deny');
    });

    test('throws for unknown tool', () => {
      const registry = new ToolRegistry();
      expect(() => registry.setPermissionLevel('Unknown', 'auto')).toThrow();
    });

    test('updates requiresPermission to match new level', () => {
      const registry = new ToolRegistry();
      registry.register(makeTool('TestTool', { requiresPermission: false, permissionLevel: 'auto' }));

      registry.setPermissionLevel('TestTool', 'confirm');
      expect(registry.requiresPermission('TestTool')).toBe(true);

      registry.setPermissionLevel('TestTool', 'auto');
      expect(registry.requiresPermission('TestTool')).toBe(false);
    });
  });

  describe('Default registry permission levels', () => {
    test('auto tools: Read, Grep, Glob, TodoWrite', () => {
      const registry = createDefaultRegistry();

      expect(registry.getPermissionLevel('Read')).toBe('auto');
      expect(registry.getPermissionLevel('Grep')).toBe('auto');
      expect(registry.getPermissionLevel('Glob')).toBe('auto');
      expect(registry.getPermissionLevel('TodoWrite')).toBe('auto');
    });

    test('confirm tools: Bash, Write, Edit, Task', () => {
      const registry = createDefaultRegistry();

      expect(registry.getPermissionLevel('Bash')).toBe('confirm');
      expect(registry.getPermissionLevel('Write')).toBe('confirm');
      expect(registry.getPermissionLevel('Edit')).toBe('confirm');
      expect(registry.getPermissionLevel('Task')).toBe('confirm');
    });

    test('backward compatibility: requiresPermission still works', () => {
      const registry = createDefaultRegistry();

      // Auto tools should not require permission
      expect(registry.requiresPermission('Read')).toBe(false);
      expect(registry.requiresPermission('Grep')).toBe(false);
      expect(registry.requiresPermission('Glob')).toBe(false);
      expect(registry.requiresPermission('TodoWrite')).toBe(false);

      // Confirm tools should require permission
      expect(registry.requiresPermission('Bash')).toBe(true);
      expect(registry.requiresPermission('Write')).toBe(true);
      expect(registry.requiresPermission('Edit')).toBe(true);
    });
  });

  describe('RegisteredTool.permissionLevel field', () => {
    test('permissionLevel is optional', () => {
      const tool = makeTool('NoLevel');
      expect(tool.permissionLevel).toBeUndefined();
    });

    test('permissionLevel can be set at registration', () => {
      const tool = makeTool('WithLevel', { permissionLevel: 'deny' });
      expect(tool.permissionLevel).toBe('deny');
    });
  });
});
