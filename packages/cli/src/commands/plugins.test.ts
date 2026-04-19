/**
 * Plugin CLI commands test suite.
 *
 * 逆向: modules/2529_unknown_t40.js (t40 function)
 * Tests the plugins list and exec CLI commands.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Command } from "commander";
import { registerPluginsCommand } from "./plugins.js";

describe("registerPluginsCommand", () => {
  it("registers plugins command with list and exec subcommands", () => {
    const program = new Command();
    registerPluginsCommand(program);

    // Find the plugins command
    const pluginsCmd = program.commands.find(
      (c) => c.name() === "plugins",
    );
    assert.ok(pluginsCmd, "Should register 'plugins' command");

    // Check subcommands
    const subNames = pluginsCmd!.commands.map((c) => c.name());
    assert.ok(subNames.includes("list"), "Should have 'list' subcommand");
    assert.ok(subNames.includes("exec"), "Should have 'exec' subcommand");
  });

  it("plugins command has 'plugin' alias", () => {
    const program = new Command();
    registerPluginsCommand(program);

    const pluginsCmd = program.commands.find(
      (c) => c.name() === "plugins",
    );
    assert.ok(pluginsCmd, "Should register 'plugins' command");
    assert.ok(
      pluginsCmd!.aliases().includes("plugin"),
      "Should have 'plugin' alias",
    );
  });

  it("list subcommand has --json option", () => {
    const program = new Command();
    registerPluginsCommand(program);

    const pluginsCmd = program.commands.find((c) => c.name() === "plugins")!;
    const listCmd = pluginsCmd.commands.find((c) => c.name() === "list")!;
    assert.ok(listCmd, "Should have 'list' subcommand");
    // Check that --json option is defined
    const jsonOpt = listCmd.options.find((o) => o.long === "--json");
    assert.ok(jsonOpt, "list should have --json option");
  });

  it("list subcommand has 'ls' alias", () => {
    const program = new Command();
    registerPluginsCommand(program);

    const pluginsCmd = program.commands.find((c) => c.name() === "plugins")!;
    const listCmd = pluginsCmd.commands.find((c) => c.name() === "list")!;
    assert.ok(
      listCmd.aliases().includes("ls"),
      "list should have 'ls' alias",
    );
  });

  it("exec subcommand requires plugin and event arguments", () => {
    const program = new Command();
    registerPluginsCommand(program);

    const pluginsCmd = program.commands.find((c) => c.name() === "plugins")!;
    const execCmd = pluginsCmd.commands.find((c) => c.name() === "exec")!;
    assert.ok(execCmd, "Should have 'exec' subcommand");

    // Commander stores arguments as registeredArguments
    const args = execCmd.registeredArguments ?? [];
    assert.ok(args.length >= 2, "exec should have at least 2 arguments");
  });

  it("exec subcommand has --data option", () => {
    const program = new Command();
    registerPluginsCommand(program);

    const pluginsCmd = program.commands.find((c) => c.name() === "plugins")!;
    const execCmd = pluginsCmd.commands.find((c) => c.name() === "exec")!;
    const dataOpt = execCmd.options.find((o) => o.long === "--data");
    assert.ok(dataOpt, "exec should have --data option");
  });
});
