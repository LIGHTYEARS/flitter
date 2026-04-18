import { describe, expect, it, mock } from "bun:test";
import type { SlashCommandContext } from "../slash-registry";
import { SlashCommandRegistry } from "../slash-registry";

function makeContext(overrides?: Partial<SlashCommandContext>): SlashCommandContext {
  return {
    threadId: "test-thread",
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    threadStore: { getThreadSnapshot: () => null, setCachedThread: () => {} } as any,
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    threadWorker: { runInference: () => {}, cancelInference: () => {} } as any,
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    configService: { get: () => ({ settings: {} }) } as any,
    showMessage: () => {},
    clearInput: () => {},
    ...overrides,
  };
}

describe("SlashCommandRegistry", () => {
  it("registers and dispatches a command", async () => {
    const registry = new SlashCommandRegistry();
    const handler = mock(async () => {});
    registry.register({
      name: "test",
      description: "Test command",
      execute: handler,
    });

    const ctx = makeContext();
    const result = await registry.dispatch("test", "", ctx);

    expect(result).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith("", ctx);
  });

  it("returns false for unknown command", async () => {
    const registry = new SlashCommandRegistry();
    const ctx = makeContext();
    const result = await registry.dispatch("nonexistent", "", ctx);
    expect(result).toBe(false);
  });

  it("dispatches with args", async () => {
    const registry = new SlashCommandRegistry();
    let receivedArgs = "";
    registry.register({
      name: "echo",
      description: "Echo args",
      execute: async (args) => {
        receivedArgs = args;
      },
    });

    const ctx = makeContext();
    await registry.dispatch("echo", "hello world", ctx);
    expect(receivedArgs).toBe("hello world");
  });

  it("lists all registered commands", () => {
    const registry = new SlashCommandRegistry();
    registry.register({ name: "a", description: "A", execute: async () => {} });
    registry.register({ name: "b", description: "B", execute: async () => {} });

    const commands = registry.listCommands();
    expect(commands).toHaveLength(2);
    expect(commands.map((c) => c.name)).toEqual(["a", "b"]);
  });

  it("supports aliases", async () => {
    const registry = new SlashCommandRegistry();
    const handler = mock(async () => {});
    registry.register({
      name: "quit",
      aliases: ["exit", "q"],
      description: "Quit",
      execute: handler,
    });

    const ctx = makeContext();
    await registry.dispatch("exit", "", ctx);
    expect(handler).toHaveBeenCalledTimes(1);

    await registry.dispatch("q", "", ctx);
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
