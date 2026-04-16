/**
 * Logger 单元测试。
 *
 * 覆盖: 日志级别过滤、scoped 子 logger、自定义 backend、
 * 环境变量控制、默认 stderr 输出。
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";

import { Logger, type LogBackend, LOG_LEVELS } from "./logger.js";

describe("Logger", () => {
  let captured: Array<{ level: string; msg: string; args: unknown[] }>;
  let backend: LogBackend;

  beforeEach(() => {
    captured = [];
    backend = {
      error: (msg, ...args) => captured.push({ level: "error", msg, args }),
      warn: (msg, ...args) => captured.push({ level: "warn", msg, args }),
      info: (msg, ...args) => captured.push({ level: "info", msg, args }),
      debug: (msg, ...args) => captured.push({ level: "debug", msg, args }),
    };
  });

  test("info 级别下 debug 消息被过滤", () => {
    const logger = new Logger({ backend, level: "info" });
    logger.debug("should not appear");
    logger.info("should appear");
    expect(captured.length).toBe(1);
    expect(captured[0]!.level).toBe("info");
  });

  test("debug 级别下所有消息都通过", () => {
    const logger = new Logger({ backend, level: "debug" });
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");
    expect(captured.length).toBe(4);
  });

  test("error 级别下只有 error 通过", () => {
    const logger = new Logger({ backend, level: "error" });
    logger.debug("no");
    logger.info("no");
    logger.warn("no");
    logger.error("yes");
    expect(captured.length).toBe(1);
    expect(captured[0]!.level).toBe("error");
  });

  test("scoped 子 logger 添加前缀", () => {
    const logger = new Logger({ backend, level: "debug" });
    const child = logger.scoped("frame");
    child.debug("tick");
    expect(captured[0]!.msg).toBe("[frame] tick");
  });

  test("嵌套 scoped 产生点分前缀", () => {
    const logger = new Logger({ backend, level: "debug" });
    const child = logger.scoped("mouse").scoped("hit");
    child.info("found 2 targets");
    expect(captured[0]!.msg).toBe("[mouse.hit] found 2 targets");
  });

  test("额外参数透传到 backend", () => {
    const logger = new Logger({ backend, level: "debug" });
    logger.info("event", { x: 10, y: 5 });
    expect(captured[0]!.args).toEqual([{ x: 10, y: 5 }]);
  });

  test("LOG_LEVELS 数值排序正确", () => {
    expect(LOG_LEVELS.error).toBeLessThan(LOG_LEVELS.warn);
    expect(LOG_LEVELS.warn).toBeLessThan(LOG_LEVELS.info);
    expect(LOG_LEVELS.info).toBeLessThan(LOG_LEVELS.debug);
  });
});

describe("Logger — FLITTER_LOG_LEVEL env var", () => {
  let captured: Array<{ level: string; msg: string; args: unknown[] }>;
  let backend: LogBackend;

  beforeEach(() => {
    captured = [];
    backend = {
      error: (msg, ...args) => captured.push({ level: "error", msg, args }),
      warn: (msg, ...args) => captured.push({ level: "warn", msg, args }),
      info: (msg, ...args) => captured.push({ level: "info", msg, args }),
      debug: (msg, ...args) => captured.push({ level: "debug", msg, args }),
    };
    process.env.FLITTER_LOG_LEVEL = "debug";
  });

  afterEach(() => {
    delete process.env.FLITTER_LOG_LEVEL;
  });

  test("从 FLITTER_LOG_LEVEL=debug 解析级别，debug 消息通过", () => {
    // No explicit level — resolveLevel() reads from env
    const logger = new Logger({ backend });
    logger.debug("env-driven debug");
    logger.info("env-driven info");
    expect(captured.length).toBe(2);
    expect(captured[0]!.level).toBe("debug");
    expect(captured[1]!.level).toBe("info");
  });

  test("env var 未设置时默认 info，debug 消息被过滤", () => {
    // Override: remove env var for this test
    delete process.env.FLITTER_LOG_LEVEL;
    const logger = new Logger({ backend });
    logger.debug("should not appear");
    logger.info("should appear");
    expect(captured.length).toBe(1);
    expect(captured[0]!.level).toBe("info");
  });
});
