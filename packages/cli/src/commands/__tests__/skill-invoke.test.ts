/**
 * Tests for /skill-invoke slash command handler.
 *
 * 逆向: e0R:1797-1860 (skill-invoke command)
 *   - amp's customFlow shows a FuzzyList picker, execute calls addPendingSkill + showToast
 *   - Flitter: text-based fallback — list on no-args, invoke by name with submitMessage
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createBuiltinCommands } from "../slash-handlers.js";
import type { SlashCommandContext } from "../slash-registry.js";
import { SlashCommandRegistry } from "../slash-registry.js";

// ─── Mock helpers ─────────────────────────────────────────

type MockSkill = { name: string; description: string };

function makeSkillService(
  skills: MockSkill[] = [],
  failScan = false,
): NonNullable<SlashCommandContext["skillService"]> {
  return {
    scan: failScan
      ? () => Promise.reject(new Error("scan failed"))
      : () => Promise.resolve({ skills, errors: [], warnings: [] }),
    list: () => skills,
  };
}

function makeCtx(
  overrides: Partial<SlashCommandContext> = {},
): SlashCommandContext & { messages: string[]; submitted: string[] } {
  const messages: string[] = [];
  const submitted: string[] = [];

  const ctx: SlashCommandContext & { messages: string[]; submitted: string[] } = {
    messages,
    submitted,
    threadId: "test-thread",
    threadStore: {
      getThreadSnapshot: () => null,
      setCachedThread: () => {},
      deleteThread: () => {},
    },
    threadWorker: {
      runInference: async () => {},
      cancelInference: () => {},
    },
    configService: {
      get: () => ({ settings: {} }),
    },
    showMessage: (msg) => messages.push(msg),
    clearInput: () => {},
    submitMessage: (text) => submitted.push(text),
    ...overrides,
  };
  return ctx;
}

function makeRegistry(): SlashCommandRegistry {
  const registry = new SlashCommandRegistry();
  createBuiltinCommands(registry);
  return registry;
}

// ─── Tests ────────────────────────────────────────────────

describe("/skill-invoke", () => {
  it("shows error when skillService is not available", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({ skillService: undefined });

    const handled = await registry.dispatch("skill-invoke", "", ctx);
    assert.ok(handled, "command should be registered");
    assert.equal(ctx.messages.length, 1);
    assert.ok(
      ctx.messages[0]!.toLowerCase().includes("not available"),
      `Expected 'not available', got: ${ctx.messages[0]}`,
    );
  });

  it("lists available skills when no args given", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({
      skillService: makeSkillService([
        { name: "code-review", description: "Review pull requests" },
        { name: "test-gen", description: "Generate tests" },
      ]),
    });

    await registry.dispatch("skill-invoke", "", ctx);

    assert.equal(ctx.messages.length, 1);
    const msg = ctx.messages[0]!;
    assert.ok(msg.includes("code-review"), `Expected code-review in: ${msg}`);
    assert.ok(msg.includes("test-gen"), `Expected test-gen in: ${msg}`);
    assert.ok(msg.includes("Available skills (2)"), `Expected count in: ${msg}`);
    assert.ok(msg.includes("Usage: /skill-invoke"), `Expected usage hint in: ${msg}`);
  });

  it("shows 'no skills' message when list is empty and no args given", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({ skillService: makeSkillService([]) });

    await registry.dispatch("skill-invoke", "", ctx);

    assert.equal(ctx.messages.length, 1);
    assert.ok(
      ctx.messages[0]!.toLowerCase().includes("no skills"),
      `Expected 'no skills', got: ${ctx.messages[0]}`,
    );
  });

  it("invokes named skill (exact match) via submitMessage", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({
      skillService: makeSkillService([{ name: "code-review", description: "Review PRs" }]),
    });

    await registry.dispatch("skill-invoke", "code-review", ctx);

    assert.equal(ctx.submitted.length, 1, "Should have submitted a message");
    assert.ok(ctx.submitted[0]!.includes("code-review"), `Submitted: ${ctx.submitted[0]}`);

    assert.equal(ctx.messages.length, 1, "Should show confirmation");
    assert.ok(ctx.messages[0]!.includes("code-review"), `Confirmation message: ${ctx.messages[0]}`);
    assert.ok(
      ctx.messages[0]!.toLowerCase().includes("next message"),
      `Expected 'next message' hint: ${ctx.messages[0]}`,
    );
  });

  it("performs case-insensitive skill name matching", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({
      skillService: makeSkillService([{ name: "Code-Review", description: "Review PRs" }]),
    });

    // Query in different case
    await registry.dispatch("skill-invoke", "CODE-REVIEW", ctx);

    assert.equal(ctx.submitted.length, 1, "Should have submitted");
    assert.ok(ctx.submitted[0]!.includes("Code-Review"), `Submitted: ${ctx.submitted[0]}`);
  });

  it("shows error with available names when skill not found", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({
      skillService: makeSkillService([
        { name: "code-review", description: "" },
        { name: "test-gen", description: "" },
      ]),
    });

    await registry.dispatch("skill-invoke", "nonexistent-skill", ctx);

    assert.equal(ctx.submitted.length, 0, "Should not submit when not found");
    assert.equal(ctx.messages.length, 1);
    const msg = ctx.messages[0]!;
    assert.ok(msg.includes("nonexistent-skill"), `Expected query in: ${msg}`);
    assert.ok(msg.toLowerCase().includes("not found"), `Expected 'not found': ${msg}`);
    // Should list available skills to help user
    assert.ok(msg.includes("code-review"), `Expected available skill code-review: ${msg}`);
    assert.ok(msg.includes("test-gen"), `Expected available skill test-gen: ${msg}`);
  });

  it("shows not-found message without list when no skills installed", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({ skillService: makeSkillService([]) });

    await registry.dispatch("skill-invoke", "my-skill", ctx);

    assert.equal(ctx.submitted.length, 0, "Should not submit");
    assert.equal(ctx.messages.length, 1);
    assert.ok(ctx.messages[0]!.includes("my-skill"), `Expected query: ${ctx.messages[0]}`);
    assert.ok(
      ctx.messages[0]!.toLowerCase().includes("not found"),
      `Expected not found: ${ctx.messages[0]}`,
    );
  });

  it("falls back to list() when scan() throws", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({
      skillService: makeSkillService(
        [{ name: "fallback-skill", description: "From list()" }],
        true, // failScan
      ),
    });

    // With no args — should still list from list() fallback
    await registry.dispatch("skill-invoke", "", ctx);

    assert.equal(ctx.messages.length, 1);
    assert.ok(
      ctx.messages[0]!.includes("fallback-skill"),
      `Expected fallback skill: ${ctx.messages[0]}`,
    );
  });

  it("shows message without submitting when submitMessage is absent", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({
      skillService: makeSkillService([{ name: "my-skill", description: "" }]),
      submitMessage: undefined,
    });

    await registry.dispatch("skill-invoke", "my-skill", ctx);

    assert.equal(ctx.submitted.length, 0, "Should not submit");
    assert.equal(ctx.messages.length, 1);
    assert.ok(
      ctx.messages[0]!.includes("my-skill"),
      `Expected skill name in message: ${ctx.messages[0]}`,
    );
  });

  it("is also reachable via alias 'invoke-skill'", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({
      skillService: makeSkillService([{ name: "my-skill", description: "" }]),
    });

    const handled = await registry.dispatch("invoke-skill", "my-skill", ctx);
    assert.ok(handled, "alias should resolve to skill-invoke");
    assert.equal(ctx.submitted.length, 1);
  });

  it("is also reachable via alias 'use-skill'", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({
      skillService: makeSkillService([{ name: "my-skill", description: "" }]),
    });

    const handled = await registry.dispatch("use-skill", "my-skill", ctx);
    assert.ok(handled, "alias should resolve to skill-invoke");
    assert.equal(ctx.submitted.length, 1);
  });
});
