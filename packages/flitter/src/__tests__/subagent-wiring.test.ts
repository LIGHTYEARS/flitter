import { describe, expect, test } from "bun:test";
import { type ContainerOptions, createContainer } from "../container";

function makeContainerOpts(): ContainerOptions {
  return {
    settings: {
      get: () => ({ model: "claude-sonnet-4-20250514" }),
      set: async () => {},
      watch: () => ({ unsubscribe: () => {} }),
      getPath: () => "/tmp/flitter-test/settings.json",
    } as unknown as ContainerOptions["settings"],
    secrets: {
      get: async () => undefined,
      set: async () => {},
      delete: async () => {},
    },
    workspaceRoot: "/tmp/flitter-test-workspace",
    dataDir: "/tmp/flitter-test-data",
    homeDir: "/tmp/flitter-test-home",
    configDir: "/tmp/flitter-test-config",
  };
}

describe("container: SubAgentManager wiring", () => {
  test("container has a subAgentManager property", async () => {
    const container = await createContainer(makeContainerOpts());
    try {
      expect((container as Record<string, unknown>).subAgentManager).toBeDefined();
    } finally {
      await container.asyncDispose();
    }
  });

  test("Task tool is registered in toolRegistry", async () => {
    const container = await createContainer(makeContainerOpts());
    try {
      expect(container.toolRegistry.has("Task")).toBe(true);
      const spec = container.toolRegistry.get("Task");
      expect(spec).not.toBeUndefined();
      expect(spec?.source).toBe("builtin");
    } finally {
      await container.asyncDispose();
    }
  });
});
