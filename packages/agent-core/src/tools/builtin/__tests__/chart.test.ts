/**
 * Tests for chart data visualization tool
 *
 * 逆向: amp modules/2026_tail_anonymous.js:140192-140296
 */
import { describe, expect, test } from "bun:test";
import { ChartTool, createChartTool } from "../chart.js";

describe("chart tool", () => {
  describe("spec", () => {
    test("has correct name and source", () => {
      expect(ChartTool.name).toBe("chart");
      expect(ChartTool.source).toBe("builtin");
    });

    test("has disableTimeout in execution profile", () => {
      expect(ChartTool.executionProfile?.disableTimeout).toBe(true);
    });

    test("has serial execution profile", () => {
      expect(ChartTool.executionProfile?.serial).toBe(true);
    });

    test("has required params: cmd, chartType, xColumn, yColumns", () => {
      const schema = ChartTool.inputSchema as {
        required: string[];
        properties: Record<string, unknown>;
      };
      expect(schema.required).toEqual(["cmd", "chartType", "xColumn", "yColumns"]);
    });

    test("has chartType enum with bar, line, area", () => {
      const schema = ChartTool.inputSchema as {
        properties: { chartType: { enum: string[] } };
      };
      expect(schema.properties.chartType.enum).toEqual(["bar", "line", "area"]);
    });

    test("has optional fields: title, subtitle, stacked, horizontal, etc", () => {
      const schema = ChartTool.inputSchema as {
        properties: Record<string, unknown>;
      };
      expect(schema.properties.title).toBeDefined();
      expect(schema.properties.subtitle).toBeDefined();
      expect(schema.properties.stacked).toBeDefined();
      expect(schema.properties.horizontal).toBeDefined();
      expect(schema.properties.hoverColumns).toBeDefined();
      expect(schema.properties.groupColumn).toBeDefined();
      expect(schema.properties.xAxisLabel).toBeDefined();
      expect(schema.properties.yAxisLabel).toBeDefined();
    });
  });

  describe("execute", () => {
    test("returns error when cmd is missing", async () => {
      const result = await ChartTool.execute!({});
      expect(result.status).toBe("error");
      expect(result.content).toContain("Missing required parameter: cmd");
    });

    test("parses valid JSON array from command output", async () => {
      const result = await ChartTool.execute!({
        cmd: `echo '[{"name":"a","val":1},{"name":"b","val":2}]'`,
        chartType: "bar",
        xColumn: "name",
        yColumns: ["val"],
      });
      expect(result.status).toBe("done");
      expect(result.data?.success).toBe(true);
      expect(result.content).toContain("2 rows");
    });

    test("parses valid JSON object", async () => {
      const result = await ChartTool.execute!({
        cmd: `echo '{"name":"a","val":1}'`,
        chartType: "bar",
        xColumn: "name",
        yColumns: ["val"],
      });
      expect(result.status).toBe("done");
      expect(result.data?.success).toBe(true);
    });

    test("returns error on invalid JSON output", async () => {
      const result = await ChartTool.execute!({
        cmd: `echo 'not json'`,
        chartType: "bar",
        xColumn: "name",
        yColumns: ["val"],
      });
      expect(result.status).toBe("error");
      expect(result.content).toContain("Invalid JSON data");
      expect(result.content).toContain("jq -c .");
    });

    test("returns error when output is a primitive (not array/object)", async () => {
      const result = await ChartTool.execute!({
        cmd: `echo '42'`,
        chartType: "bar",
        xColumn: "name",
        yColumns: ["val"],
      });
      expect(result.status).toBe("error");
      expect(result.content).toContain("not a JSON array or object");
    });

    test("returns error when command fails", async () => {
      const result = await ChartTool.execute!({
        cmd: "nonexistent_command_that_should_fail_12345",
        chartType: "bar",
        xColumn: "x",
        yColumns: ["y"],
      });
      expect(result.status).toBe("error");
      expect(result.content).toContain("Command failed");
    });

    test("handles null JSON output as error", async () => {
      const result = await ChartTool.execute!({
        cmd: `echo 'null'`,
        chartType: "bar",
        xColumn: "name",
        yColumns: ["val"],
      });
      expect(result.status).toBe("error");
      expect(result.content).toContain("not a JSON array or object");
    });

    test("createChartTool returns a valid ToolSpec", () => {
      const tool = createChartTool();
      expect(tool.name).toBe("chart");
      expect(typeof tool.execute).toBe("function");
    });
  });
});
