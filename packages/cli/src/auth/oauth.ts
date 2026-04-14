/**
 * OAuth PKCE 认证流程
 *
 * 实现 OAuth 2.0 Authorization Code + PKCE 浏览器回调认证:
 * 1. 生成 PKCE challenge (复用 @flitter/llm generatePKCE)
 * 2. 启动本地 HTTP 回调服务器 (端口重试)
 * 3. 打开浏览器到授权 URL
 * 4. 接收回调, 验证 state (防 CSRF)
 * 5. 交换 code → token
 * 6. 关闭服务器, 返回结果
 *
 * 逆向参考: r3R() in session-management.js:~200
 *
 * @example
 * ```ts
 * import { performOAuth } from "./oauth";
 *
 * const result = await performOAuth("https://auth.example.com");
 * if (result.success) {
 *   console.log("Token:", result.token);
 * }
 * ```
 */
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";
import { generatePKCE } from "@flitter/llm";

/** 回调服务器默认起始端口 */
const CALLBACK_PORT_START = 49152;

/** 回调服务器端口重试次数 */
const CALLBACK_PORT_RETRIES = 10;

/**
 * OAuth 认证结果
 */
export interface OAuthResult {
  /** 是否认证成功 */
  success: boolean;
  /** 成功时的 access token */
  token?: string;
  /** 失败时的错误信息 */
  error?: string;
}

/**
 * performOAuth 的可选依赖注入 (方便测试)
 */
export interface OAuthHooks {
  /** 打开浏览器到指定 URL (可替换为 mock) */
  openBrowser?: (url: string) => Promise<void>;
  /** 交换 code → token (可替换为 mock) */
  exchangeCodeForToken?: (
    ampURL: string,
    code: string,
    codeVerifier: string,
    redirectUri: string,
  ) => Promise<string>;
}

/**
 * 回调等待结果
 */
interface CallbackResult {
  code?: string;
  error?: string;
}

/**
 * 构建 OAuth 授权 URL
 *
 * @param ampURL - 授权服务器基础 URL
 * @param params - PKCE 参数
 * @returns 完整的授权 URL
 */
export function buildAuthUrl(
  ampURL: string,
  params: {
    codeChallenge: string;
    state: string;
    redirectUri: string;
  },
): string {
  const url = new URL("/oauth/authorize", ampURL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", params.state);
  url.searchParams.set("redirect_uri", params.redirectUri);
  return url.toString();
}

/**
 * 启动 OAuth 回调服务器
 *
 * 从 startPort 开始尝试绑定, 冲突时自动重试下一个端口。
 * 返回的对象包含:
 * - port: Promise<number> 实际绑定的端口
 * - stop(): 关闭服务器
 * - server: 底层 HTTP Server 实例
 *
 * @param startPort - 起始端口 (默认 49152)
 * @param maxRetries - 最大重试次数 (默认 10)
 */
export function startOAuthCallbackServer(
  startPort: number = CALLBACK_PORT_START,
  maxRetries: number = CALLBACK_PORT_RETRIES,
): { server: Server; port: Promise<number>; stop: () => void } {
  let resolvePort: (port: number) => void;
  let rejectPort: (err: Error) => void;
  const portPromise = new Promise<number>((resolve, reject) => {
    resolvePort = resolve;
    rejectPort = reject;
  });

  const server = createServer();
  let currentPort = startPort;
  let attempts = 0;

  const tryListen = () => {
    if (attempts >= maxRetries) {
      const err = new Error(
        `Failed to bind callback server on ports ${startPort}-${startPort + maxRetries - 1}`,
      );
      rejectPort(err);
      throw err;
    }
    server.listen(currentPort, "127.0.0.1");
  };

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      attempts++;
      currentPort++;
      if (attempts >= maxRetries) {
        rejectPort(
          new Error(
            `Failed to bind callback server on ports ${startPort}-${startPort + maxRetries - 1}`,
          ),
        );
        return;
      }
      tryListen();
    } else {
      rejectPort(err);
    }
  });

  server.on("listening", () => {
    const addr = server.address();
    if (addr && typeof addr === "object") {
      resolvePort(addr.port);
    }
  });

  tryListen();

  return {
    server,
    port: portPromise,
    stop: () => {
      if (server.listening) server.close();
    },
  };
}

/**
 * 等待 OAuth 回调
 *
 * 在已启动的 HTTP 服务器上监听 /callback 请求,
 * 验证 state 参数匹配后提取 authorization code。
 *
 * @param server - 已启动的 HTTP 服务器
 * @param expectedState - 期望的 state 值 (防 CSRF)
 * @param timeout - 超时毫秒数 (默认 120000)
 * @returns 回调结果 (code 或 error)
 */
export function waitForCallback(
  server: Server,
  expectedState: string,
  timeout: number = 120_000,
): Promise<CallbackResult> {
  return new Promise<CallbackResult>((resolve, reject) => {
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };

    timeoutId = setTimeout(() => {
      if (!settled) {
        cleanup();
        reject(new Error(`OAuth callback timeout after ${timeout}ms`));
      }
    }, timeout);

    server.on("request", (req: IncomingMessage, res: ServerResponse) => {
      if (settled) {
        res.writeHead(400);
        res.end("Already handled");
        return;
      }

      const url = new URL(req.url ?? "/", "http://127.0.0.1");

      // 只处理 /callback 路径
      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end("Not Found");
        return;
      }

      // 检查 error 响应
      const error = url.searchParams.get("error");
      if (error) {
        const errorDesc = url.searchParams.get("error_description") ?? error;
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(errorPage(errorDesc));
        cleanup();
        resolve({ error: errorDesc });
        return;
      }

      // 验证 state (防 CSRF)
      const state = url.searchParams.get("state");
      if (state !== expectedState) {
        res.writeHead(403, { "Content-Type": "text/html; charset=utf-8" });
        res.end(errorPage("State mismatch - possible CSRF attack"));
        // 不 resolve, 继续等待正确的回调
        return;
      }

      // 提取 authorization code
      const code = url.searchParams.get("code");
      if (!code) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(errorPage("No authorization code received"));
        return;
      }

      // 成功
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(successPage());
      cleanup();
      resolve({ code });
    });
  });
}

/**
 * 执行完整的 OAuth PKCE 认证流程
 *
 * 步骤:
 * 1. 生成 PKCE challenge (verifier + challenge)
 * 2. 生成随机 state (防 CSRF)
 * 3. 启动本地回调服务器
 * 4. 构建授权 URL 并打开浏览器
 * 5. 等待回调获取 code
 * 6. 交换 code → token
 * 7. 关闭服务器, 返回结果
 *
 * @param ampURL - 授权服务器 URL
 * @param hooks - 可选的依赖注入 (测试用)
 * @returns OAuth 认证结果
 */
export async function performOAuth(
  ampURL: string,
  hooks?: OAuthHooks,
): Promise<OAuthResult> {
  // 1. 生成 PKCE
  const { verifier: codeVerifier, challenge: codeChallenge } = await generatePKCE();
  const state = crypto.randomUUID();

  // 2. 启动回调服务器
  const callbackServer = startOAuthCallbackServer(CALLBACK_PORT_START);
  let port: number;
  try {
    port = await callbackServer.port;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
  const redirectUri = `http://localhost:${port}/callback`;

  try {
    // 3. 构建授权 URL
    const authUrl = buildAuthUrl(ampURL, {
      codeChallenge,
      state,
      redirectUri,
    });

    // 4. 打开浏览器
    const openBrowser = hooks?.openBrowser ?? defaultOpenBrowser;
    await openBrowser(authUrl);
    process.stderr.write("Opening browser for authentication...\n");
    process.stderr.write(`If browser doesn't open, visit: ${authUrl}\n`);

    // 5. 等待回调
    const result = await waitForCallback(callbackServer.server, state);

    if (!result.code) {
      return { success: false, error: result.error || "No code received" };
    }

    // 6. 交换 code → token
    const exchangeCodeForToken = hooks?.exchangeCodeForToken ?? defaultExchangeCodeForToken;
    const token = await exchangeCodeForToken(ampURL, result.code, codeVerifier, redirectUri);

    return { success: true, token };
  } catch (err: any) {
    return { success: false, error: err.message };
  } finally {
    // 7. 关闭服务器
    callbackServer.stop();
  }
}

/**
 * 默认的浏览器打开函数
 *
 * 使用 child_process.execFile 调用系统默认浏览器。
 * execFile 不启动 shell，URL 作为参数数组传递，防止命令注入。
 * macOS: open, Linux: xdg-open, Windows: cmd /c start
 */
async function defaultOpenBrowser(url: string): Promise<void> {
  const { execFile } = await import("node:child_process");
  const cmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "cmd"
        : "xdg-open";

  if (process.platform === "win32") {
    execFile(cmd, ["/c", "start", "", url]);
  } else {
    execFile(cmd, [url]);
  }
}

/**
 * 默认的 code → token 交换函数
 *
 * POST 到 ampURL/oauth/token 交换 authorization code 为 access token。
 */
async function defaultExchangeCodeForToken(
  ampURL: string,
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<string> {
  const tokenUrl = new URL("/oauth/token", ampURL);
  const response = await fetch(tokenUrl.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("No access_token in token response");
  }
  return data.access_token;
}

// ─── HTML 页面 ──────────────────────────────────────────

function successPage(): string {
  return `<!DOCTYPE html>
<html><head><title>Authorization Successful</title></head>
<body style="font-family:system-ui;text-align:center;padding:50px">
<h2>Authorization Successful</h2>
<p>You can close this window and return to the terminal.</p>
</body></html>`;
}

function errorPage(message: string): string {
  const escaped = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!DOCTYPE html>
<html><head><title>Authorization Error</title></head>
<body style="font-family:system-ui;text-align:center;padding:50px">
<h2>Authorization Error</h2>
<p>${escaped}</p>
<p>Please close this window and try again.</p>
</body></html>`;
}
