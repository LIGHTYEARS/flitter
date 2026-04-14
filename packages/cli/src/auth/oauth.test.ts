/**
 * OAuth PKCE 认证流程测试
 *
 * 测试 OAuth 认证流程: PKCE 生成、回调服务器启动、state 验证、token 交换。
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  performOAuth,
  buildAuthUrl,
  waitForCallback,
  startOAuthCallbackServer,
  type OAuthResult,
} from "./oauth";
import { createServer, type Server } from "node:http";

// ─── startOAuthCallbackServer ──────────────────────────

describe("startOAuthCallbackServer", () => {
  let server: ReturnType<typeof startOAuthCallbackServer> | undefined;

  afterEach(() => {
    if (server) {
      server.stop();
      server = undefined;
    }
  });

  it("应该绑定到指定端口", async () => {
    server = startOAuthCallbackServer(49200);
    const port = await server.port;
    expect(port).toBe(49200);
  });

  it("端口冲突时应重试下一个端口", async () => {
    // 先占用 49201
    const blocker = createServer();
    await new Promise<void>((resolve, reject) => {
      blocker.listen(49201, "127.0.0.1", resolve);
      blocker.on("error", reject);
    });
    try {
      server = startOAuthCallbackServer(49201, 10);
      const port = await server.port;
      expect(port).toBeGreaterThan(49201);
    } finally {
      blocker.close();
    }
  });

  it("所有端口都失败时应抛错", async () => {
    // 占用 49210 和 49211
    const blockers: Server[] = [];
    for (let p = 49210; p <= 49211; p++) {
      const s = createServer();
      await new Promise<void>((resolve, reject) => {
        s.listen(p, "127.0.0.1", resolve);
        s.on("error", reject);
      });
      blockers.push(s);
    }
    try {
      // maxRetries=2 means only tries 49210 and 49211
      const result = startOAuthCallbackServer(49210, 2);
      await expect(result.port).rejects.toThrow(/Failed to bind/);
    } finally {
      for (const s of blockers) s.close();
    }
  });
});

// ─── buildAuthUrl ───────────────────────────────────────

describe("buildAuthUrl", () => {
  it("应该构建含 PKCE 参数的授权 URL", () => {
    const url = buildAuthUrl("https://auth.example.com", {
      codeChallenge: "test-challenge",
      state: "test-state",
      redirectUri: "http://localhost:49152/callback",
    });
    expect(url).toContain("https://auth.example.com");
    expect(url).toContain("code_challenge=test-challenge");
    expect(url).toContain("state=test-state");
    expect(url).toContain("redirect_uri=");
    expect(url).toContain("code_challenge_method=S256");
    expect(url).toContain("response_type=code");
  });
});

// ─── waitForCallback ────────────────────────────────────

describe("waitForCallback", () => {
  it("收到正确 state 的回调时应返回 code", async () => {
    const server = createServer();
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const addr = server.address() as { port: number };

    const resultPromise = waitForCallback(server, "correct-state", 5000);

    // 模拟浏览器回调
    const response = await fetch(
      `http://127.0.0.1:${addr.port}/callback?code=auth-code-123&state=correct-state`
    );
    expect(response.ok).toBe(true);

    const result = await resultPromise;
    expect(result.code).toBe("auth-code-123");

    server.close();
  });

  it("state 不匹配时应拒绝", async () => {
    const server = createServer();
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const addr = server.address() as { port: number };

    const resultPromise = waitForCallback(server, "expected-state", 3000);

    // 发送错误 state
    await fetch(
      `http://127.0.0.1:${addr.port}/callback?code=auth-code-123&state=wrong-state`
    );

    // waitForCallback 应该不会因此 resolve
    // 发送超时来验证它确实没有 resolve
    try {
      await Promise.race([
        resultPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1000)),
      ]);
      // 如果到这里说明拿到了结果, 不期望这样
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.message).toBe("timeout");
    }

    server.close();
  });
});

// ─── performOAuth (mock) ────────────────────────────────

describe("performOAuth", () => {
  it("完整流程应返回 OAuthResult", async () => {
    // performOAuth 需要打开浏览器和启动服务器
    // 在测试中使用 mock openBrowser 和 mock exchangeCodeForToken
    const result = await performOAuth("https://auth.example.com", {
      openBrowser: async (url: string) => {
        // 模拟浏览器回调: 解析 URL 获取 state 和 redirect_uri
        const parsed = new URL(url);
        const state = parsed.searchParams.get("state");
        const redirectUri = parsed.searchParams.get("redirect_uri");
        if (redirectUri && state) {
          // 延迟一点模拟浏览器行为
          setTimeout(async () => {
            await fetch(`${redirectUri}?code=test-code&state=${state}`);
          }, 50);
        }
      },
      exchangeCodeForToken: async () => "test-token-abc",
    });

    expect(result.success).toBe(true);
    expect(result.token).toBe("test-token-abc");
  });
});

// ─── handleLogout ───────────────────────────────────────

describe("handleLogout (via auth module)", () => {
  it("应该调用 secrets.delete 清除 apiKey", async () => {
    const { handleLogout } = await import("../commands/auth");
    const deletedKeys: string[] = [];
    const mockDeps = {
      secrets: {
        async get() { return undefined; },
        async set() {},
        async delete(key: string, scope?: string) {
          deletedKeys.push(`${key}@${scope}`);
        },
      },
      ampURL: "https://api.example.com",
    };
    const mockContext = {
      executeMode: false,
      isTTY: true,
      headless: false,
      streamJson: false,
      verbose: false,
    };
    await handleLogout(mockDeps as any, mockContext);
    expect(deletedKeys).toContain("apiKey@https://api.example.com");
  });
});
