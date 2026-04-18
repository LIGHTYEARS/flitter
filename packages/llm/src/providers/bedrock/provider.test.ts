/**
 * @flitter/llm — Bedrock Provider 测试
 *
 * No amp reference: Flitter extension for enterprise Bedrock deployments.
 */

import { describe, expect, test } from "bun:test";
import { createProvider, getProviderForModel, resolveProvider } from "../registry";
import { BedrockProvider } from "./provider";

// ─── resolveProvider 测试 ────────────────────────────────

describe("Bedrock provider resolution", () => {
  test("bedrock/claude-sonnet-4-20250514 resolves to bedrock provider", () => {
    const name = resolveProvider("bedrock/claude-sonnet-4-20250514");
    expect(name).toBe("bedrock");
  });

  test("bedrock/us.anthropic.claude-sonnet-4-20250514-v1:0 resolves to bedrock", () => {
    const name = resolveProvider("bedrock/us.anthropic.claude-sonnet-4-20250514-v1:0");
    expect(name).toBe("bedrock");
  });

  test("aws-bedrock/claude-haiku resolves to bedrock via alias", () => {
    const name = resolveProvider("aws-bedrock/claude-haiku");
    expect(name).toBe("bedrock");
  });
});

// ─── BedrockProvider 实例化测试 ─────────────────────────

describe("BedrockProvider", () => {
  test("can be instantiated", () => {
    const provider = new BedrockProvider();
    expect(provider.name).toBe("bedrock");
  });

  test("is returned by createProvider('bedrock')", () => {
    const provider = createProvider("bedrock");
    expect(provider).toBeInstanceOf(BedrockProvider);
  });

  test("getProviderForModel resolves bedrock/ prefix", () => {
    const provider = getProviderForModel("bedrock/claude-sonnet-4-20250514");
    expect(provider).toBeInstanceOf(BedrockProvider);
  });
});

// ─── Bedrock credential detection ───────────────────────

describe("BedrockProvider credential detection", () => {
  test("reads AWS_REGION from environment", () => {
    const originalRegion = process.env.AWS_REGION;
    process.env.AWS_REGION = "eu-west-1";
    try {
      const provider = new BedrockProvider();
      expect(provider.name).toBe("bedrock");
    } finally {
      if (originalRegion) process.env.AWS_REGION = originalRegion;
      else delete process.env.AWS_REGION;
    }
  });

  test("defaults to us-east-1 when no AWS_REGION set", () => {
    const originalRegion = process.env.AWS_REGION;
    const originalDefault = process.env.AWS_DEFAULT_REGION;
    delete process.env.AWS_REGION;
    delete process.env.AWS_DEFAULT_REGION;
    try {
      const provider = new BedrockProvider();
      expect(provider.name).toBe("bedrock");
    } finally {
      if (originalRegion) process.env.AWS_REGION = originalRegion;
      if (originalDefault) process.env.AWS_DEFAULT_REGION = originalDefault;
    }
  });

  test("uses AWS_DEFAULT_REGION as fallback when AWS_REGION not set", () => {
    const originalRegion = process.env.AWS_REGION;
    const originalDefault = process.env.AWS_DEFAULT_REGION;
    delete process.env.AWS_REGION;
    process.env.AWS_DEFAULT_REGION = "ap-southeast-1";
    try {
      const provider = new BedrockProvider();
      expect(provider.name).toBe("bedrock");
    } finally {
      if (originalRegion) process.env.AWS_REGION = originalRegion;
      else delete process.env.AWS_REGION;
      if (originalDefault) process.env.AWS_DEFAULT_REGION = originalDefault;
      else delete process.env.AWS_DEFAULT_REGION;
    }
  });
});
