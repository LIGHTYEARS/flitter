/**
 * Tests for MCP OAuth 2.0 PKCE authentication flow.
 * Uses node:http createServer on port 0 to mock OAuth endpoints.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {
  parseWWWAuthenticate,
  discoverProtectedResource,
  discoverAuthorizationServer,
  registerClient,
  buildAuthorizationUrl,
  exchangeAuthorizationCode,
  refreshAccessToken,
  auth,
  TokenError,
  CredentialError,
  InvalidTokenError,
} from "./oauth-provider";
import type {
  MCPAuthProvider,
  OAuthTokens,
  OAuthClientInfo,
  AuthorizationServerMetadata,
} from "./types";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Create a test HTTP server with a request handler. Returns base URL. */
function createTestServer(
  handler: (
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ) => void,
): Promise<{ url: string; server: http.Server }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      resolve({ url: `http://127.0.0.1:${addr.port}`, server });
    });
  });
}

function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

/** Minimal mock auth server metadata */
function mockServerMetadata(baseUrl: string): AuthorizationServerMetadata {
  return {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/authorize`,
    token_endpoint: `${baseUrl}/token`,
    registration_endpoint: `${baseUrl}/register`,
    response_types_supported: ["code"],
    code_challenge_methods_supported: ["S256"],
  };
}

/** Build a mock MCPAuthProvider for testing */
function mockProvider(overrides: Partial<MCPAuthProvider> = {}): MCPAuthProvider {
  let _tokens: OAuthTokens | undefined;
  let _codeVerifier = "";
  let _clientInfo: OAuthClientInfo | undefined;
  let _redirectUrl: URL | undefined;

  return {
    redirectUrl: "http://localhost:3000/callback",
    clientMetadata: {
      redirect_uris: ["http://localhost:3000/callback"],
      client_name: "test-client",
    },
    async tokens() {
      return _tokens;
    },
    async saveTokens(tokens: OAuthTokens) {
      _tokens = tokens;
    },
    async redirectToAuthorization(url: URL) {
      _redirectUrl = url;
    },
    async codeVerifier() {
      return _codeVerifier;
    },
    async saveCodeVerifier(v: string) {
      _codeVerifier = v;
    },
    async clientInformation() {
      return _clientInfo;
    },
    async saveClientInformation(info: OAuthClientInfo) {
      _clientInfo = info;
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// parseWWWAuthenticate
// ---------------------------------------------------------------------------
describe("parseWWWAuthenticate", () => {
  it("should parse resource_metadata, scope, and error from Bearer header", () => {
    const response = new Response(null, {
      status: 401,
      headers: {
        "WWW-Authenticate":
          'Bearer resource_metadata="https://example.com/.well-known/oauth-protected-resource", scope="read write", error="invalid_token"',
      },
    });

    const result = parseWWWAuthenticate(response);
    assert.equal(
      result.resourceMetadataUrl,
      "https://example.com/.well-known/oauth-protected-resource",
    );
    assert.equal(result.scope, "read write");
    assert.equal(result.error, "invalid_token");
  });

  it("should return empty object when no WWW-Authenticate header", () => {
    const response = new Response(null, { status: 401 });
    const result = parseWWWAuthenticate(response);
    assert.deepEqual(result, {});
  });

  it("should return empty object for non-Bearer scheme", () => {
    const response = new Response(null, {
      status: 401,
      headers: { "WWW-Authenticate": "Basic realm=test" },
    });
    const result = parseWWWAuthenticate(response);
    assert.deepEqual(result, {});
  });

  it("should handle Bearer with only scope", () => {
    const response = new Response(null, {
      status: 401,
      headers: { "WWW-Authenticate": 'Bearer scope="openid profile"' },
    });
    const result = parseWWWAuthenticate(response);
    assert.equal(result.scope, "openid profile");
    assert.equal(result.resourceMetadataUrl, undefined);
    assert.equal(result.error, undefined);
  });

  it("should handle unquoted parameter values", () => {
    const response = new Response(null, {
      status: 401,
      headers: { "WWW-Authenticate": "Bearer error=invalid_token" },
    });
    const result = parseWWWAuthenticate(response);
    assert.equal(result.error, "invalid_token");
  });

  it("should return empty object for Bearer with no parameters", () => {
    const response = new Response(null, {
      status: 401,
      headers: { "WWW-Authenticate": "Bearer" },
    });
    const result = parseWWWAuthenticate(response);
    assert.deepEqual(result, {});
  });
});

// ---------------------------------------------------------------------------
// discoverProtectedResource
// ---------------------------------------------------------------------------
describe("discoverProtectedResource", () => {
  let server: http.Server;
  let baseUrl: string;

  afterEach(async () => {
    if (server) await closeServer(server);
  });

  it("should fetch and return protected resource metadata", async () => {
    const metadata = {
      resource: "https://api.example.com",
      authorization_servers: ["https://auth.example.com"],
      scopes_supported: ["read", "write"],
    };

    ({ url: baseUrl, server } = await createTestServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(metadata));
    }));

    const result = await discoverProtectedResource(
      `${baseUrl}/.well-known/oauth-protected-resource`,
    );
    assert.equal(result.resource, "https://api.example.com");
    assert.deepEqual(result.authorization_servers, [
      "https://auth.example.com",
    ]);
    assert.deepEqual(result.scopes_supported, ["read", "write"]);
  });

  it("should throw on 404", async () => {
    ({ url: baseUrl, server } = await createTestServer((_req, res) => {
      res.writeHead(404);
      res.end("Not Found");
    }));

    await assert.rejects(
      () => discoverProtectedResource(`${baseUrl}/not-found`),
      /Failed to fetch protected resource metadata: 404/,
    );
  });
});

// ---------------------------------------------------------------------------
// discoverAuthorizationServer
// ---------------------------------------------------------------------------
describe("discoverAuthorizationServer", () => {
  let server: http.Server;
  let baseUrl: string;

  afterEach(async () => {
    if (server) await closeServer(server);
  });

  it("should discover via .well-known/oauth-authorization-server", async () => {
    const metadata = mockServerMetadata("https://auth.example.com");

    ({ url: baseUrl, server } = await createTestServer((req, res) => {
      if (req.url === "/.well-known/oauth-authorization-server") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(metadata));
      } else {
        res.writeHead(404);
        res.end();
      }
    }));

    const result = await discoverAuthorizationServer(baseUrl);
    assert.equal(result.issuer, "https://auth.example.com");
    assert.equal(
      result.authorization_endpoint,
      "https://auth.example.com/authorize",
    );
  });

  it("should fall back to .well-known/openid-configuration", async () => {
    const metadata = mockServerMetadata("https://auth.example.com");

    ({ url: baseUrl, server } = await createTestServer((req, res) => {
      if (req.url === "/.well-known/openid-configuration") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(metadata));
      } else {
        res.writeHead(404);
        res.end();
      }
    }));

    const result = await discoverAuthorizationServer(baseUrl);
    assert.equal(result.issuer, "https://auth.example.com");
  });

  it("should throw when both discovery URLs fail", async () => {
    ({ url: baseUrl, server } = await createTestServer((_req, res) => {
      res.writeHead(404);
      res.end();
    }));

    await assert.rejects(
      () => discoverAuthorizationServer(baseUrl),
      /Failed to discover authorization server/,
    );
  });

  it("should handle path-suffix well-known URLs", async () => {
    const metadata = mockServerMetadata("https://auth.example.com");

    ({ url: baseUrl, server } = await createTestServer((req, res) => {
      if (
        req.url === "/.well-known/oauth-authorization-server/v1/auth"
      ) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(metadata));
      } else {
        res.writeHead(404);
        res.end();
      }
    }));

    const result = await discoverAuthorizationServer(
      `${baseUrl}/v1/auth`,
    );
    assert.equal(result.issuer, "https://auth.example.com");
  });
});

// ---------------------------------------------------------------------------
// registerClient
// ---------------------------------------------------------------------------
describe("registerClient", () => {
  let server: http.Server;
  let baseUrl: string;

  afterEach(async () => {
    if (server) await closeServer(server);
  });

  it("should register a client and return client info", async () => {
    const clientInfo = {
      client_id: "new-client-123",
      client_secret: "secret-456",
    };

    ({ url: baseUrl, server } = await createTestServer((req, res) => {
      if (req.url === "/register" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          const parsed = JSON.parse(body);
          assert.equal(parsed.client_name, "test-client");
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(clientInfo));
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    }));

    const metadata = mockServerMetadata(baseUrl);
    metadata.registration_endpoint = `${baseUrl}/register`;

    const result = await registerClient(metadata, {
      redirect_uris: ["http://localhost:3000/callback"],
      client_name: "test-client",
    });

    assert.equal(result.client_id, "new-client-123");
    assert.equal(result.client_secret, "secret-456");
  });

  it("should throw when no registration endpoint", async () => {
    const metadata = mockServerMetadata("https://example.com");
    delete (metadata as Record<string, unknown>).registration_endpoint;

    await assert.rejects(
      () =>
        registerClient(metadata, {
          redirect_uris: ["http://localhost:3000/callback"],
        }),
      /does not support dynamic client registration/,
    );
  });

  it("should throw on registration failure", async () => {
    ({ url: baseUrl, server } = await createTestServer((_req, res) => {
      res.writeHead(400);
      res.end("Bad Request");
    }));

    const metadata = mockServerMetadata(baseUrl);
    metadata.registration_endpoint = `${baseUrl}/register`;

    await assert.rejects(
      () =>
        registerClient(metadata, {
          redirect_uris: ["http://localhost:3000/callback"],
        }),
      /Client registration failed: 400/,
    );
  });
});

// ---------------------------------------------------------------------------
// buildAuthorizationUrl
// ---------------------------------------------------------------------------
describe("buildAuthorizationUrl", () => {
  it("should build URL with PKCE parameters", async () => {
    const metadata = mockServerMetadata("https://auth.example.com");
    const clientInfo: OAuthClientInfo = { client_id: "my-client" };

    const { url, codeVerifier } = await buildAuthorizationUrl(
      metadata,
      clientInfo,
      "http://localhost:3000/callback",
      "read write",
    );

    assert.equal(url.origin, "https://auth.example.com");
    assert.equal(url.pathname, "/authorize");
    assert.equal(url.searchParams.get("response_type"), "code");
    assert.equal(url.searchParams.get("client_id"), "my-client");
    assert.equal(
      url.searchParams.get("redirect_uri"),
      "http://localhost:3000/callback",
    );
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");
    assert.equal(url.searchParams.get("scope"), "read write");

    // Should have a code_challenge
    const challenge = url.searchParams.get("code_challenge");
    assert.ok(challenge, "code_challenge should be present");
    assert.ok(challenge!.length > 0, "code_challenge should be non-empty");

    // code_verifier should be present
    assert.ok(codeVerifier.length > 0, "codeVerifier should be non-empty");
  });

  it("should omit scope when not provided", async () => {
    const metadata = mockServerMetadata("https://auth.example.com");
    const clientInfo: OAuthClientInfo = { client_id: "my-client" };

    const { url } = await buildAuthorizationUrl(
      metadata,
      clientInfo,
      "http://localhost:3000/callback",
    );

    assert.equal(url.searchParams.get("scope"), null);
  });

  it("should generate unique PKCE pairs for each call", async () => {
    const metadata = mockServerMetadata("https://auth.example.com");
    const clientInfo: OAuthClientInfo = { client_id: "my-client" };

    const a = await buildAuthorizationUrl(
      metadata,
      clientInfo,
      "http://localhost:3000/callback",
    );
    const b = await buildAuthorizationUrl(
      metadata,
      clientInfo,
      "http://localhost:3000/callback",
    );

    assert.notEqual(a.codeVerifier, b.codeVerifier);
    assert.notEqual(
      a.url.searchParams.get("code_challenge"),
      b.url.searchParams.get("code_challenge"),
    );
  });
});

// ---------------------------------------------------------------------------
// exchangeAuthorizationCode
// ---------------------------------------------------------------------------
describe("exchangeAuthorizationCode", () => {
  let server: http.Server;
  let baseUrl: string;

  afterEach(async () => {
    if (server) await closeServer(server);
  });

  it("should exchange code for tokens", async () => {
    const tokens: OAuthTokens = {
      access_token: "access-123",
      token_type: "Bearer",
      refresh_token: "refresh-456",
      expires_in: 3600,
    };

    ({ url: baseUrl, server } = await createTestServer((req, res) => {
      if (req.url === "/token" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          const params = new URLSearchParams(body);
          assert.equal(params.get("grant_type"), "authorization_code");
          assert.equal(params.get("code"), "auth-code-789");
          assert.equal(params.get("code_verifier"), "my-verifier");
          assert.equal(
            params.get("redirect_uri"),
            "http://localhost:3000/callback",
          );
          assert.equal(params.get("client_id"), "client-abc");
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(tokens));
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    }));

    const metadata = mockServerMetadata(baseUrl);
    metadata.token_endpoint = `${baseUrl}/token`;

    const result = await exchangeAuthorizationCode(
      metadata,
      { client_id: "client-abc" },
      "auth-code-789",
      "my-verifier",
      "http://localhost:3000/callback",
    );

    assert.equal(result.access_token, "access-123");
    assert.equal(result.token_type, "Bearer");
    assert.equal(result.refresh_token, "refresh-456");
  });

  it("should include client_secret when present", async () => {
    ({ url: baseUrl, server } = await createTestServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        const params = new URLSearchParams(body);
        assert.equal(params.get("client_secret"), "secret-xyz");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            access_token: "token",
            token_type: "Bearer",
          }),
        );
      });
    }));

    const metadata = mockServerMetadata(baseUrl);
    metadata.token_endpoint = `${baseUrl}/token`;

    await exchangeAuthorizationCode(
      metadata,
      { client_id: "c", client_secret: "secret-xyz" },
      "code",
      "verifier",
      "http://localhost/cb",
    );
  });

  it("should throw TokenError on failure", async () => {
    ({ url: baseUrl, server } = await createTestServer((_req, res) => {
      res.writeHead(400);
      res.end("Bad Request");
    }));

    const metadata = mockServerMetadata(baseUrl);
    metadata.token_endpoint = `${baseUrl}/token`;

    await assert.rejects(
      () =>
        exchangeAuthorizationCode(
          metadata,
          { client_id: "c" },
          "code",
          "verifier",
          "http://localhost/cb",
        ),
      (err: unknown) => {
        assert.ok(err instanceof TokenError);
        assert.match(err.message, /Token exchange failed: 400/);
        return true;
      },
    );
  });
});

// ---------------------------------------------------------------------------
// refreshAccessToken
// ---------------------------------------------------------------------------
describe("refreshAccessToken", () => {
  let server: http.Server;
  let baseUrl: string;

  afterEach(async () => {
    if (server) await closeServer(server);
  });

  it("should refresh tokens", async () => {
    const newTokens: OAuthTokens = {
      access_token: "new-access",
      token_type: "Bearer",
      refresh_token: "new-refresh",
    };

    ({ url: baseUrl, server } = await createTestServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        const params = new URLSearchParams(body);
        assert.equal(params.get("grant_type"), "refresh_token");
        assert.equal(params.get("refresh_token"), "old-refresh");
        assert.equal(params.get("client_id"), "client-abc");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(newTokens));
      });
    }));

    const metadata = mockServerMetadata(baseUrl);
    metadata.token_endpoint = `${baseUrl}/token`;

    const result = await refreshAccessToken(
      metadata,
      { client_id: "client-abc" },
      "old-refresh",
    );

    assert.equal(result.access_token, "new-access");
    assert.equal(result.refresh_token, "new-refresh");
  });

  it("should throw InvalidTokenError on failure", async () => {
    ({ url: baseUrl, server } = await createTestServer((_req, res) => {
      res.writeHead(401);
      res.end("Unauthorized");
    }));

    const metadata = mockServerMetadata(baseUrl);
    metadata.token_endpoint = `${baseUrl}/token`;

    await assert.rejects(
      () =>
        refreshAccessToken(metadata, { client_id: "c" }, "bad-token"),
      (err: unknown) => {
        assert.ok(err instanceof InvalidTokenError);
        assert.match(err.message, /Token refresh failed: 401/);
        return true;
      },
    );
  });
});

// ---------------------------------------------------------------------------
// auth() orchestration
// ---------------------------------------------------------------------------
describe("auth() orchestration", () => {
  let server: http.Server;
  let baseUrl: string;

  afterEach(async () => {
    if (server) await closeServer(server);
  });

  it("should return REDIRECT for full redirect flow (no existing tokens)", async () => {
    const clientInfo: OAuthClientInfo = {
      client_id: "registered-client",
      client_secret: "secret",
    };

    ({ url: baseUrl, server } = await createTestServer((req, res) => {
      if (
        req.url === "/.well-known/oauth-authorization-server"
      ) {
        // Use the actual test server baseUrl so register endpoint is reachable
        const serverMeta = mockServerMetadata(baseUrl);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(serverMeta));
      } else if (req.url === "/register" && req.method === "POST") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(clientInfo));
      } else {
        res.writeHead(404);
        res.end();
      }
    }));

    let redirectedUrl: URL | undefined;
    let savedVerifier = "";

    const provider = mockProvider({
      async redirectToAuthorization(url: URL) {
        redirectedUrl = url;
      },
      async saveCodeVerifier(v: string) {
        savedVerifier = v;
      },
    });

    const result = await auth(provider, {
      serverUrl: baseUrl,
    });

    assert.equal(result, "REDIRECT");
    assert.ok(redirectedUrl, "should have redirected");
    assert.equal(
      redirectedUrl!.searchParams.get("response_type"),
      "code",
    );
    assert.ok(savedVerifier.length > 0, "should have saved code verifier");
  });

  it("should return AUTHORIZED when exchanging authorization code", async () => {
    const tokens: OAuthTokens = {
      access_token: "new-access",
      token_type: "Bearer",
    };

    ({ url: baseUrl, server } = await createTestServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      if (
        req.url === "/.well-known/oauth-authorization-server"
      ) {
        res.end(
          JSON.stringify({
            issuer: baseUrl,
            authorization_endpoint: `${baseUrl}/authorize`,
            token_endpoint: `${baseUrl}/token`,
            registration_endpoint: `${baseUrl}/register`,
            response_types_supported: ["code"],
            code_challenge_methods_supported: ["S256"],
          }),
        );
      } else if (req.url === "/token") {
        res.end(JSON.stringify(tokens));
      } else {
        res.writeHead(404);
        res.end();
      }
    }));

    let savedTokens: OAuthTokens | undefined;

    const provider = mockProvider({
      async clientInformation() {
        return { client_id: "existing-client" };
      },
      async codeVerifier() {
        return "stored-verifier";
      },
      async saveTokens(t: OAuthTokens) {
        savedTokens = t;
      },
    });

    const result = await auth(provider, {
      serverUrl: baseUrl,
      authorizationCode: "my-auth-code",
    });

    assert.equal(result, "AUTHORIZED");
    assert.ok(savedTokens, "should have saved tokens");
    assert.equal(savedTokens!.access_token, "new-access");
  });

  it("should return AUTHORIZED when refreshing tokens", async () => {
    const newTokens: OAuthTokens = {
      access_token: "refreshed-access",
      token_type: "Bearer",
      refresh_token: "new-refresh",
    };

    ({ url: baseUrl, server } = await createTestServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      if (
        req.url === "/.well-known/oauth-authorization-server"
      ) {
        res.end(
          JSON.stringify({
            issuer: baseUrl,
            authorization_endpoint: `${baseUrl}/authorize`,
            token_endpoint: `${baseUrl}/token`,
            response_types_supported: ["code"],
          }),
        );
      } else if (req.url === "/token") {
        res.end(JSON.stringify(newTokens));
      } else {
        res.writeHead(404);
        res.end();
      }
    }));

    let savedTokens: OAuthTokens | undefined;

    const provider = mockProvider({
      async clientInformation() {
        return { client_id: "existing-client" };
      },
      async tokens() {
        return {
          access_token: "old-access",
          token_type: "Bearer",
          refresh_token: "old-refresh",
        };
      },
      async saveTokens(t: OAuthTokens) {
        savedTokens = t;
      },
    });

    const result = await auth(provider, {
      serverUrl: baseUrl,
    });

    assert.equal(result, "AUTHORIZED");
    assert.ok(savedTokens, "should have saved tokens");
    assert.equal(savedTokens!.access_token, "refreshed-access");
  });

  it("should retry on TokenError after invalidating credentials", async () => {
    let tokenCallCount = 0;
    const tokens: OAuthTokens = {
      access_token: "success-access",
      token_type: "Bearer",
    };

    ({ url: baseUrl, server } = await createTestServer((req, res) => {
      if (
        req.url === "/.well-known/oauth-authorization-server"
      ) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            issuer: baseUrl,
            authorization_endpoint: `${baseUrl}/authorize`,
            token_endpoint: `${baseUrl}/token`,
            response_types_supported: ["code"],
          }),
        );
      } else if (req.url === "/token") {
        tokenCallCount++;
        if (tokenCallCount === 1) {
          // First call fails
          res.writeHead(400);
          res.end("Bad");
        } else {
          // Retry succeeds
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(tokens));
        }
      } else {
        res.writeHead(404);
        res.end();
      }
    }));

    let invalidateScope: string | undefined;
    let savedTokens: OAuthTokens | undefined;

    const provider = mockProvider({
      async clientInformation() {
        return { client_id: "existing-client" };
      },
      async codeVerifier() {
        return "my-verifier";
      },
      async saveTokens(t: OAuthTokens) {
        savedTokens = t;
      },
      async invalidateCredentials(scope: "all" | "tokens" | "client") {
        invalidateScope = scope;
      },
    });

    const result = await auth(provider, {
      serverUrl: baseUrl,
      authorizationCode: "retry-code",
    });

    assert.equal(result, "AUTHORIZED");
    assert.equal(invalidateScope, "all");
    assert.equal(tokenCallCount, 2);
    assert.ok(savedTokens);
    assert.equal(savedTokens!.access_token, "success-access");
  });

  it("should use protected resource metadata for auth server discovery", async () => {
    const resourceMeta = {
      resource: "https://api.example.com",
      authorization_servers: ["https://auth.example.com"],
      scopes_supported: ["api.read"],
    };

    ({ url: baseUrl, server } = await createTestServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      if (req.url === "/resource-metadata") {
        res.end(JSON.stringify(resourceMeta));
      } else if (
        req.url === "/.well-known/oauth-authorization-server"
      ) {
        // This should NOT be called since we redirect to auth.example.com
        res.end(
          JSON.stringify(
            mockServerMetadata("https://auth.example.com"),
          ),
        );
      } else {
        res.writeHead(404);
        res.end();
      }
    }));

    // We need the auth server to be reachable too. We'll mock fetchFn.
    const authServerMeta = mockServerMetadata(
      "https://auth.example.com",
    );
    let redirectedUrl: URL | undefined;

    const provider = mockProvider({
      async redirectToAuthorization(url: URL) {
        redirectedUrl = url;
      },
    });

    // Custom fetch that routes requests appropriately
    const testFetch = async (
      input: string | URL | Request,
      init?: RequestInit,
    ): Promise<Response> => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url === `${baseUrl}/resource-metadata`) {
        return new Response(JSON.stringify(resourceMeta), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (
        url ===
        "https://auth.example.com/.well-known/oauth-authorization-server"
      ) {
        return new Response(JSON.stringify(authServerMeta), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url === "https://auth.example.com/register") {
        return new Response(
          JSON.stringify({
            client_id: "registered",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      return new Response("Not Found", { status: 404 });
    };

    const result = await auth(provider, {
      serverUrl: baseUrl,
      resourceMetadataUrl: `${baseUrl}/resource-metadata`,
      fetchFn: testFetch as typeof fetch,
    });

    assert.equal(result, "REDIRECT");
    assert.ok(redirectedUrl);
    assert.equal(redirectedUrl!.origin, "https://auth.example.com");
  });

  it("should use client_id_metadata_document when supported", async () => {
    const serverMeta: AuthorizationServerMetadata = {
      issuer: "https://auth.example.com",
      authorization_endpoint: "https://auth.example.com/authorize",
      token_endpoint: "https://auth.example.com/token",
      response_types_supported: ["code"],
      client_id_metadata_document_supported: true,
    };

    let savedClient: OAuthClientInfo | undefined;
    let redirectedUrl: URL | undefined;

    const provider = mockProvider({
      clientMetadataUrl: "https://my-app.example.com/.well-known/oauth-client",
      async clientInformation() {
        return undefined;
      },
      async saveClientInformation(info: OAuthClientInfo) {
        savedClient = info;
      },
      async redirectToAuthorization(url: URL) {
        redirectedUrl = url;
      },
    });

    const testFetch = async (
      input: string | URL | Request,
    ): Promise<Response> => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.includes("oauth-authorization-server")) {
        return new Response(JSON.stringify(serverMeta), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("Not Found", { status: 404 });
    };

    const result = await auth(provider, {
      serverUrl: "https://auth.example.com",
      fetchFn: testFetch as typeof fetch,
    });

    assert.equal(result, "REDIRECT");
    assert.ok(savedClient);
    assert.equal(
      savedClient!.client_id,
      "https://my-app.example.com/.well-known/oauth-client",
    );
    assert.ok(redirectedUrl);
    assert.equal(
      redirectedUrl!.searchParams.get("client_id"),
      "https://my-app.example.com/.well-known/oauth-client",
    );
  });

  it("should retry on InvalidTokenError with tokens invalidation", async () => {
    let refreshCallCount = 0;

    const testFetch = async (
      input: string | URL | Request,
      init?: RequestInit,
    ): Promise<Response> => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.includes("oauth-authorization-server")) {
        return new Response(
          JSON.stringify({
            issuer: "https://auth.example.com",
            authorization_endpoint: "https://auth.example.com/authorize",
            token_endpoint: "https://auth.example.com/token",
            response_types_supported: ["code"],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/token")) {
        refreshCallCount++;
        if (refreshCallCount === 1) {
          // First refresh fails -> InvalidTokenError
          return new Response("Unauthorized", { status: 401 });
        }
        // Second call (after retry) also goes to redirect
        return new Response("Unauthorized", { status: 401 });
      }
      return new Response("Not Found", { status: 404 });
    };

    let invalidateScope: string | undefined;
    let redirected = false;

    const provider = mockProvider({
      async clientInformation() {
        return { client_id: "existing-client" };
      },
      async tokens() {
        if (invalidateScope === "tokens") {
          // After invalidation, no more tokens
          return undefined;
        }
        return {
          access_token: "old",
          token_type: "Bearer",
          refresh_token: "old-refresh",
        };
      },
      async invalidateCredentials(scope: "all" | "tokens" | "client") {
        invalidateScope = scope;
      },
      async redirectToAuthorization() {
        redirected = true;
      },
    });

    const result = await auth(provider, {
      serverUrl: "https://auth.example.com",
      fetchFn: testFetch as typeof fetch,
    });

    assert.equal(result, "REDIRECT");
    assert.equal(invalidateScope, "tokens");
    assert.ok(redirected, "should have redirected after retry");
  });

  it("should validate resource URL when provider supports it", async () => {
    const resourceMeta = {
      resource: "https://evil.example.com",
    };

    const testFetch = async (
      input: string | URL | Request,
    ): Promise<Response> => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.includes("resource-meta")) {
        return new Response(JSON.stringify(resourceMeta), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("oauth-authorization-server")) {
        return new Response(
          JSON.stringify(
            mockServerMetadata("https://auth.example.com"),
          ),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("Not Found", { status: 404 });
    };

    const provider = mockProvider({
      async validateResourceURL(url: string) {
        // Reject evil resources
        return !url.includes("evil");
      },
    });

    await assert.rejects(
      () =>
        auth(provider, {
          serverUrl: "https://auth.example.com",
          resourceMetadataUrl: "https://auth.example.com/resource-meta",
          fetchFn: testFetch as typeof fetch,
        }),
      /Resource URL validation failed/,
    );
  });

  it("should use scope from options over resource metadata", async () => {
    const serverMeta = mockServerMetadata("https://auth.example.com");
    let redirectedUrl: URL | undefined;

    const testFetch = async (
      input: string | URL | Request,
    ): Promise<Response> => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.includes("oauth-authorization-server")) {
        return new Response(JSON.stringify(serverMeta), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/register")) {
        return new Response(
          JSON.stringify({ client_id: "test-client" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("Not Found", { status: 404 });
    };

    const provider = mockProvider({
      async redirectToAuthorization(url: URL) {
        redirectedUrl = url;
      },
    });

    await auth(provider, {
      serverUrl: "https://auth.example.com",
      scope: "custom-scope",
      fetchFn: testFetch as typeof fetch,
    });

    assert.ok(redirectedUrl);
    assert.equal(redirectedUrl!.searchParams.get("scope"), "custom-scope");
  });
});

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------
describe("Error types", () => {
  it("TokenError should be an Error with correct name", () => {
    const err = new TokenError("test");
    assert.ok(err instanceof Error);
    assert.equal(err.name, "TokenError");
    assert.equal(err.message, "test");
  });

  it("CredentialError should be an Error with correct name", () => {
    const err = new CredentialError("test");
    assert.ok(err instanceof Error);
    assert.equal(err.name, "CredentialError");
    assert.equal(err.message, "test");
  });

  it("InvalidTokenError should be an Error with correct name", () => {
    const err = new InvalidTokenError("test");
    assert.ok(err instanceof Error);
    assert.equal(err.name, "InvalidTokenError");
    assert.equal(err.message, "test");
  });
});
