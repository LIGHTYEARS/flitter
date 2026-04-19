/**
 * Plugin runtime template unit tests
 *
 * Verifies the generated runtime shim has correct structure.
 * 逆向: amp-cli-reversed/chunk-005.js:19668-19746 (UWR template)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generatePluginRuntime, validateRuntimeTemplate } from "./plugin-runtime";
import { PLUGIN_READY_EVENT } from "./types";

describe("generatePluginRuntime", () => {
  const pluginPath = "/home/user/.flitter/plugins/my-plugin.ts";

  it("generates valid TypeScript/Bun code", () => {
    const code = generatePluginRuntime(pluginPath);
    assert.ok(typeof code === "string");
    assert.ok(code.length > 0);
  });

  it("includes shebang for bun", () => {
    // 逆向: UWR starts with #!/usr/bin/env bun
    const code = generatePluginRuntime(pluginPath);
    assert.ok(code.startsWith("#!/usr/bin/env bun"));
  });

  it("imports the plugin file", () => {
    const code = generatePluginRuntime(pluginPath);
    assert.ok(code.includes(pluginPath));
    assert.ok(code.includes("import("));
  });

  it("sets up stdin readline interface", () => {
    // 逆向: BWR line reader (chunk-005.js:145566-145570)
    const code = generatePluginRuntime(pluginPath);
    assert.ok(code.includes("createInterface"));
    assert.ok(code.includes("process.stdin"));
  });

  it("emits runtime.ready event on startup", () => {
    // 逆向: QWR = "runtime.ready" (chunk-005.js:19746)
    const code = generatePluginRuntime(pluginPath);
    assert.ok(code.includes(PLUGIN_READY_EVENT));
    assert.ok(code.includes('sendEvent("runtime.ready"'));
  });

  it("handles JSON-RPC request messages", () => {
    const code = generatePluginRuntime(pluginPath);
    assert.ok(code.includes("handleRequest"));
    assert.ok(code.includes("sendResponse"));
  });

  it("handles events.list method", () => {
    // 逆向: $aT.listRegisteredEvents (chunk-002.js:27033-27038)
    const code = generatePluginRuntime(pluginPath);
    assert.ok(code.includes("events.list"));
  });

  it("handles tool.list method", () => {
    // 逆向: $aT.listTools (chunk-002.js:27019-27025)
    const code = generatePluginRuntime(pluginPath);
    assert.ok(code.includes("tool.list"));
  });

  it("serializes messages as JSON + newline", () => {
    // 逆向: nuT (chunk-002.js:27067-27069)
    const code = generatePluginRuntime(pluginPath);
    assert.ok(code.includes('JSON.stringify(msg) + "\\n"'));
  });

  it("escapes plugin paths with special characters", () => {
    const specialPath = "/home/user/my plugin's dir/test.ts";
    const code = generatePluginRuntime(specialPath);
    assert.ok(code.includes("my plugin\\'s dir"));
  });

  it("includes error handling for plugin load failure", () => {
    const code = generatePluginRuntime(pluginPath);
    assert.ok(code.includes("Failed to load plugin"));
    assert.ok(code.includes("process.exit(1)"));
  });
});

describe("validateRuntimeTemplate", () => {
  it("validates a correctly generated template", () => {
    const code = generatePluginRuntime("/test/plugin.ts");
    const result = validateRuntimeTemplate(code);
    assert.equal(result.hasReadyEvent, true);
    assert.equal(result.hasStdinReader, true);
    assert.equal(result.hasSerialize, true);
    assert.equal(result.hasPluginImport, true);
  });

  it("detects missing ready event", () => {
    const result = validateRuntimeTemplate("console.log('no ready event')");
    assert.equal(result.hasReadyEvent, false);
  });

  it("detects missing stdin reader", () => {
    const result = validateRuntimeTemplate("// no stdin reader");
    assert.equal(result.hasStdinReader, false);
  });
});
