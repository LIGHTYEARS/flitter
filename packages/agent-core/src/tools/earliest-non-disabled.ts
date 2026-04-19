/**
 * findEarliestNonDisabledTool — returns the first tool_use in a sequence
 * whose tool is not in the disabled list.
 *
 * 逆向: amp-cli-reversed/modules/1737_EarliestNonDisabledTool_$mR.js
 *   function A(o, n) in $mR:
 *   ```
 *   function A(o, n) {
 *     if (!o) { J.warn("findEarliestNonDisabledTool called with empty tool name"); return; }
 *     let p = R.filter(_ => _.spec.name === o);
 *     if (p.length === 0) {
 *       let _ = o.toLowerCase();
 *       p = R.filter(m => m.spec.name.toLowerCase() === _);
 *     }
 *     for (let _ of p) if (yy(_.spec, n).enabled) return _;
 *     return;
 *   }
 *   ```
 *
 * Simplified for Flitter: accepts an array of {name, ...} tool uses and
 * a Settings object, returns the first whose tool is enabled in the config.
 */

import type { Settings } from "@flitter/schemas";

/**
 * Minimal tool-use shape expected by this function.
 */
export interface ToolUseEntry {
  name: string;
  [key: string]: unknown;
}

/**
 * Returns the first tool_use in the sequence whose tool is NOT disabled.
 *
 * A tool is disabled if:
 * - It appears in config["tools.disable"]
 * - config["tools.enable"] exists and the tool is NOT in it
 *
 * 逆向: $mR.A (modules/1737:66-78) — yy() enable/disable check
 */
export function findEarliestNonDisabledTool(
  toolUses: ToolUseEntry[],
  config: Settings,
): ToolUseEntry | undefined {
  const disabled = config["tools.disable"];
  const enabled = config["tools.enable"];

  for (const toolUse of toolUses) {
    if (!toolUse.name) continue;

    // Check if tool is disabled
    if (disabled?.includes(toolUse.name)) continue;

    // Check if tool is enabled (whitelist mode)
    if (enabled && !enabled.includes(toolUse.name)) continue;

    return toolUse;
  }

  return undefined;
}
