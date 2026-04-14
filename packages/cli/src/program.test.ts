/**
 * program.ts 单元测试
 *
 * 覆盖 Commander.js 命令树创建: createProgram 返回值、版本输出、
 * 全局选项解析、子命令注册、未知命令处理
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Command } from "commander";
import { createProgram } from "./program";

describe("createProgram", () => {
  // ─── 基础结构 ─────────────────────────────────────────────

  it("返回 Command 实例", () => {
    const program = createProgram("1.0.0");
    assert.ok(program instanceof Command);
  });

  it("name 为 'flitter'", () => {
    const program = createProgram("1.0.0");
    assert.equal(program.name(), "flitter");
  });

  it("version 与传入参数一致", () => {
    const program = createProgram("2.3.4");
    assert.equal(program.version(), "2.3.4");
  });

  // ─── 全局选项 ─────────────────────────────────────────────

  describe("全局选项解析", () => {
    it("--execute/-e 解析为布尔", () => {
      const program = createProgram("1.0.0");
      program.parse(["-e"], { from: "user" });
      assert.equal(program.opts().execute, true);
    });

    it("--headless 解析为布尔", () => {
      const program = createProgram("1.0.0");
      program.parse(["--headless"], { from: "user" });
      assert.equal(program.opts().headless, true);
    });

    it("--stream-json 解析为布尔", () => {
      const program = createProgram("1.0.0");
      program.parse(["--stream-json"], { from: "user" });
      assert.equal(program.opts().streamJson, true);
    });

    it("--no-color 解析为布尔 (color=false)", () => {
      const program = createProgram("1.0.0");
      program.parse(["--no-color"], { from: "user" });
      assert.equal(program.opts().color, false);
    });

    it("--verbose/-v 解析为布尔", () => {
      const program = createProgram("1.0.0");
      program.parse(["-v"], { from: "user" });
      assert.equal(program.opts().verbose, true);
    });
  });

  // ─── 子命令注册 ───────────────────────────────────────────

  describe("子命令注册", () => {
    it("login 子命令已注册", () => {
      const program = createProgram("1.0.0");
      const cmd = program.commands.find((c) => c.name() === "login");
      assert.ok(cmd, "login command should be registered");
    });

    it("logout 子命令已注册", () => {
      const program = createProgram("1.0.0");
      const cmd = program.commands.find((c) => c.name() === "logout");
      assert.ok(cmd, "logout command should be registered");
    });

    it("threads 子命令已注册", () => {
      const program = createProgram("1.0.0");
      const cmd = program.commands.find((c) => c.name() === "threads");
      assert.ok(cmd, "threads command should be registered");
    });

    it("config 子命令已注册", () => {
      const program = createProgram("1.0.0");
      const cmd = program.commands.find((c) => c.name() === "config");
      assert.ok(cmd, "config command should be registered");
    });

    it("update 子命令已注册", () => {
      const program = createProgram("1.0.0");
      const cmd = program.commands.find((c) => c.name() === "update");
      assert.ok(cmd, "update command should be registered");
    });
  });

  // ─── threads 子子命令 ──────────────────────────────────────

  describe("threads 子子命令", () => {
    it("threads list 已注册", () => {
      const program = createProgram("1.0.0");
      const threads = program.commands.find((c) => c.name() === "threads")!;
      const list = threads.commands.find((c) => c.name() === "list");
      assert.ok(list, "threads list should be registered");
    });

    it("threads new 已注册", () => {
      const program = createProgram("1.0.0");
      const threads = program.commands.find((c) => c.name() === "threads")!;
      const newCmd = threads.commands.find((c) => c.name() === "new");
      assert.ok(newCmd, "threads new should be registered");
    });

    it("threads continue 已注册", () => {
      const program = createProgram("1.0.0");
      const threads = program.commands.find((c) => c.name() === "threads")!;
      const cont = threads.commands.find((c) => c.name() === "continue");
      assert.ok(cont, "threads continue should be registered");
    });

    it("threads archive 已注册", () => {
      const program = createProgram("1.0.0");
      const threads = program.commands.find((c) => c.name() === "threads")!;
      const archive = threads.commands.find((c) => c.name() === "archive");
      assert.ok(archive, "threads archive should be registered");
    });

    it("threads delete 已注册", () => {
      const program = createProgram("1.0.0");
      const threads = program.commands.find((c) => c.name() === "threads")!;
      const del = threads.commands.find((c) => c.name() === "delete");
      assert.ok(del, "threads delete should be registered");
    });

    it("threads list --limit 默认值为 '20'", () => {
      const program = createProgram("1.0.0");
      const threads = program.commands.find((c) => c.name() === "threads")!;
      const list = threads.commands.find((c) => c.name() === "list")!;
      list.parse([], { from: "user" });
      assert.equal(list.opts().limit, "20");
    });

    it("threads list --format 默认值为 'table'", () => {
      const program = createProgram("1.0.0");
      const threads = program.commands.find((c) => c.name() === "threads")!;
      const list = threads.commands.find((c) => c.name() === "list")!;
      list.parse([], { from: "user" });
      assert.equal(list.opts().format, "table");
    });
  });

  // ─── config 子子命令 ───────────────────────────────────────

  describe("config 子子命令", () => {
    it("config get 已注册", () => {
      const program = createProgram("1.0.0");
      const config = program.commands.find((c) => c.name() === "config")!;
      const get = config.commands.find((c) => c.name() === "get");
      assert.ok(get, "config get should be registered");
    });

    it("config set 已注册", () => {
      const program = createProgram("1.0.0");
      const config = program.commands.find((c) => c.name() === "config")!;
      const set = config.commands.find((c) => c.name() === "set");
      assert.ok(set, "config set should be registered");
    });

    it("config list 已注册", () => {
      const program = createProgram("1.0.0");
      const config = program.commands.find((c) => c.name() === "config")!;
      const list = config.commands.find((c) => c.name() === "list");
      assert.ok(list, "config list should be registered");
    });
  });

  // ─── update 选项 ──────────────────────────────────────────

  describe("update 选项", () => {
    it("update --target-version 接受版本号", () => {
      const program = createProgram("1.0.0");
      const update = program.commands.find((c) => c.name() === "update")!;
      update.parse(["--target-version", "3.0.0"], { from: "user" });
      assert.equal(update.opts().targetVersion, "3.0.0");
    });
  });

  // ─── 未知命令 ─────────────────────────────────────────────

  describe("未知命令处理", () => {
    it("未知命令不抛异常 (被视为 message 参数)", () => {
      const program = createProgram("1.0.0");
      // allowUnknownOption + variadic message 参数使得未知输入被捕获为 args
      program.parse(["unknown-cmd-xyz"], { from: "user" });
      assert.ok(program.args.includes("unknown-cmd-xyz"));
    });
  });

  // ─── message 参数 ─────────────────────────────────────────

  describe("message 参数", () => {
    it("接受可选的 message 参数", () => {
      const program = createProgram("1.0.0");
      program.parse(["hello", "world"], { from: "user" });
      assert.deepEqual(program.args, ["hello", "world"]);
    });
  });
});
