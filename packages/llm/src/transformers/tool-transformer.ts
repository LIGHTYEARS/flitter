/**
 * @flitter/llm — 工具转换器基类
 *
 * 提供 BaseToolTransformer 抽象类和工具验证辅助方法
 *
 * @example
 * ```ts
 * class AnthropicToolTransformer extends BaseToolTransformer<AnthropicTool> {
 *   toProviderTools(tools) { return tools.map(t => ({ ... })); }
 * }
 * ```
 */
import type { ToolTransformer } from "../provider";
import type { ToolDefinition } from "../types";

/**
 * 工具转换器抽象基类
 *
 * 提供工具定义验证和 JSON Schema 规范化方法
 */
export abstract class BaseToolTransformer<TNativeTool>
  implements ToolTransformer<TNativeTool>
{
  abstract toProviderTools(tools: ToolDefinition[]): TNativeTool[];

  /**
   * 验证工具定义必需字段
   *
   * @throws Error 如果缺少必需字段
   */
  validateToolDefinition(tool: ToolDefinition): void {
    if (!tool.name || tool.name.trim().length === 0) {
      throw new Error("ToolDefinition.name is required");
    }
    if (!tool.description || tool.description.trim().length === 0) {
      throw new Error("ToolDefinition.description is required");
    }
    if (!tool.inputSchema || typeof tool.inputSchema !== "object") {
      throw new Error("ToolDefinition.inputSchema must be an object");
    }
  }

  /**
   * 规范化 JSON Schema
   *
   * 确保 schema 包含 type: "object" (大多数 Provider 要求)
   */
  normalizeInputSchema(schema: Record<string, unknown>): Record<string, unknown> {
    if (!schema.type) {
      return { type: "object", ...schema };
    }
    return schema;
  }
}
