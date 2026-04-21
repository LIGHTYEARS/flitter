/**
 * Chart data visualization tool
 *
 * Runs a shell command that produces JSON data, validates the output,
 * and returns structured chart data for TUI rendering.
 *
 * 逆向: amp-cli-reversed/modules/2026_tail_anonymous.js:140192-140296
 *   - rFR.spec: name "$D" (= "chart"), description tFR, source "builtin"
 *   - rFR.fn: runs cmd via hFR (bash helper), strips newlines, parses JSON,
 *     validates array/object, returns {status: "done", result: {success, data}}
 *
 * 逆向: $D = "chart" (modules/2026_tail_anonymous.js:7022)
 * 逆向: tFR = description (modules/2026_tail_anonymous.js:13965-14012)
 * 逆向: inputSchema at modules/2026_tail_anonymous.js:140196-140256
 *
 * @module
 */

import { exec } from "node:child_process";
import type { ToolResult, ToolSpec } from "../types.js";

// ─── Constants ─────────────────────────────────────────────

/** Maximum rows per series before truncation (逆向: tFR line 14007) */
const MAX_ROWS = 100;

/** Command execution timeout (30 seconds) */
const CMD_TIMEOUT_MS = 30_000;

// ─── Description ───────────────────────────────────────────
// 逆向: tFR from modules/2026_tail_anonymous.js:13965-14012

const CHART_DESCRIPTION = `Render a chart visualization by running a command that produces JSON data. The chart is displayed inline to the user.

Use this tool to visualize data as bar charts, line charts, or area charts. You provide a shell command that outputs JSON, and specify which columns map to the X and Y axes, the chart type, and display options.

# Parameters

- **cmd**: A shell command to execute that must produce JSON output (a JSON array of objects). The command is run via the Bash tool internally. Pipe through \`jq -c .\` if needed to produce compact JSON.
- **chartType**: "bar", "line", or "area"
- **xColumn**: The column name to use for the X axis (labels)
- **yColumns**: Array of column names for the Y axis. Multiple columns create multiple series (e.g., overlay revenue and expenses on the same chart).
- **title**: Chart title displayed above the chart
- **stacked**: When true with multiple yColumns, stack the series instead of overlaying them. Works with bar and area charts.
- **horizontal**: When true with bar chartType, renders horizontal bars (good for categorical data with long labels).
- **hoverColumns**: Extra column names to show in the hover tooltip but not plotted on the Y axis.
- **groupColumn**: A column whose unique values become separate series. Use with a single yColumn to pivot unpivoted data — e.g., rows with a "type" column become one series per type. Commonly used with stacked charts.

# When to use this tool

- When the user explicitly asks to "chart", "graph", "plot", or "visualize" data
- When the user explicitly requests a visual representation of data
- Do NOT use this tool proactively for tabular data unless the user asks for a visualization

# Examples

Bar chart from a BigQuery query:
{"cmd":"bq query --format=json --nouse_legacy_sql 'SELECT name, score FROM dataset.table LIMIT 10'","chartType":"bar","xColumn":"name","yColumns":["score"],"title":"Test Scores"}

Multi-series comparison:
{"cmd":"cat data.json","chartType":"bar","xColumn":"month","yColumns":["revenue","expenses"],"title":"Revenue vs Expenses"}

Horizontal bar chart:
{"cmd":"echo '[{\\"tool\\":\\"Bash\\",\\"count\\":42},{\\"tool\\":\\"Read\\",\\"count\\":31}]'","chartType":"bar","xColumn":"tool","yColumns":["count"],"title":"Tool Usage","horizontal":true}

Stacked area chart:
{"cmd":"cat commits.json","chartType":"area","xColumn":"date","yColumns":["frontend","backend"],"title":"Commits by Team","stacked":true}

Stacked area chart with groupColumn (auto-pivots rows by credit_type):
{"cmd":"bq query --format=json --nouse_legacy_sql 'SELECT hour, credits, credit_type FROM dataset.usage'","chartType":"area","xColumn":"hour","yColumns":["credits"],"groupColumn":"credit_type","title":"Credits by Type","stacked":true}

# Best practices

- Pipe through \`jq -c .\` if the command might produce non-JSON text (headers, warnings) or pretty-printed output that could break parsing.
- The chart renders at most 100 points per series (extra rows are silently dropped). Use aggregation (GROUP BY) or LIMIT so the JSON output stays under this threshold.
- Use \`groupColumn\` to pivot flat rows into multiple series instead of running separate queries or reshaping data manually.
- ISO-date xColumn values (YYYY-MM-DD…) are automatically sorted ascending; categorical labels preserve source order.
- Include a \`link\` key in JSON rows to make tooltip values clickable hyperlinks.
- Use \`hoverColumns\` to surface extra context (IDs, descriptions) in tooltips without adding chart clutter.
- Choose \`horizontal: true\` for bar charts when labels are long (e.g. file paths, URLs).`;

// ─── Helpers ──────────────────────────────────────────────

/**
 * Execute a shell command and return its output.
 *
 * 逆向: hFR(cmd, ctx) — runs cmd via bash, returns { output, error }
 */
function runCommand(cmd: string, cwd?: string): Promise<{ output: string; error?: string }> {
  return new Promise((resolve) => {
    exec(
      cmd,
      { timeout: CMD_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024, cwd },
      (error, stdout, stderr) => {
        if (error) {
          resolve({
            output: "",
            error: `Command failed: ${error.message}${stderr ? `\nStderr: ${stderr}` : ""}`,
          });
          return;
        }
        resolve({ output: stdout });
      },
    );
  });
}

// ─── Tool ──────────────────────────────────────────────────

/**
 * Create the chart data visualization tool spec.
 *
 * 逆向: rFR = { spec: {...}, fn: (...) => ... } at modules/2026_tail_anonymous.js:140192-140296
 */
export function createChartTool(): ToolSpec {
  return {
    name: "chart",
    description: CHART_DESCRIPTION,
    source: "builtin",
    executionProfile: {
      serial: true,
      resourceKeys: [{ key: "bash", mode: "write" }],
      disableTimeout: true,
    },
    inputSchema: {
      type: "object",
      properties: {
        cmd: {
          type: "string",
          description:
            "A shell command to execute that produces JSON output (a JSON array of objects).",
        },
        chartType: {
          type: "string",
          enum: ["bar", "line", "area"],
          description: "The type of chart to render.",
        },
        xColumn: {
          type: "string",
          description: "Column name to use for the X axis (labels).",
        },
        yColumns: {
          type: "array",
          items: { type: "string" },
          description: "Column name(s) for the Y axis. Multiple columns create multiple series.",
        },
        title: {
          type: "string",
          description: "Chart title.",
        },
        subtitle: {
          type: "string",
          description: "Optional subtitle shown below the title.",
        },
        xAxisLabel: {
          type: "string",
          description: "Label for the X axis. Defaults to the xColumn name.",
        },
        yAxisLabel: {
          type: "string",
          description: "Label for the Y axis. Defaults to the first yColumn name.",
        },
        stacked: {
          type: "boolean",
          description:
            "Stack multiple series instead of overlaying. Works with bar and area charts.",
        },
        horizontal: {
          type: "boolean",
          description: "Render bars horizontally. Only applies to bar chartType.",
        },
        hoverColumns: {
          type: "array",
          items: { type: "string" },
          description: "Extra columns to display in hover tooltips but not plotted on the Y axis.",
        },
        groupColumn: {
          type: "string",
          description:
            'Column whose unique values become separate series. Pivots unpivoted data — e.g., a "type" column creates one series per type. Use with a single yColumn.',
        },
      },
      required: ["cmd", "chartType", "xColumn", "yColumns"],
    },

    /**
     * Execute the chart tool: run command, parse JSON output, return data.
     *
     * 逆向: rFR.fn at modules/2026_tail_anonymous.js:140259-140296
     *
     * Flow:
     * 1. Run the shell command via exec
     * 2. Strip newlines from output (amp: e = a.output.replace(/\n/g, ""))
     * 3. JSON.parse and validate (must be array or object)
     * 4. Return {status: "done", data: rawJsonString}
     */
    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const cmd = args.cmd as string;
      if (!cmd) {
        return {
          status: "error",
          content: "Missing required parameter: cmd",
        };
      }

      const result = await runCommand(cmd);

      if (result.error) {
        return {
          status: "error",
          content: result.error,
        };
      }

      // Strip newlines to normalize JSON (逆向: a.output.replace(/\n/g, ""))
      const rawOutput = result.output.replace(/\n/g, "");

      try {
        const parsed = JSON.parse(rawOutput);

        // Validate: must be array or non-null object
        // 逆向: if (!Array.isArray(t)) { if (typeof t !== "object" || t === null) return error }
        if (!Array.isArray(parsed)) {
          if (typeof parsed !== "object" || parsed === null) {
            return {
              status: "error",
              content: "Data is not a JSON array or object. Expected a JSON array of objects.",
            };
          }
        }

        // Truncate to MAX_ROWS if array
        let data = rawOutput;
        if (Array.isArray(parsed) && parsed.length > MAX_ROWS) {
          data = JSON.stringify(parsed.slice(0, MAX_ROWS));
        }

        return {
          status: "done",
          content: `Chart data loaded successfully (${Array.isArray(parsed) ? parsed.length : 1} rows).`,
          data: { success: true, data },
        };
      } catch (err) {
        return {
          status: "error",
          content: `Invalid JSON data: ${err instanceof Error ? err.message : String(err)}. The command output was not valid JSON. Try piping the command output through \`jq -c .\` to produce compact single-line JSON.`,
        };
      }
    },
  };
}

/** Pre-built instance for convenience */
export const ChartTool = createChartTool();
