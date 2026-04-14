/**
 * @flitter/llm -- MCP OAuth 2.0 PKCE Provider
 *
 * Implements the MCP OAuth auth flow:
 * 401 -> discover protected resource -> discover auth server -> register client ->
 * build auth URL -> redirect -> exchange code -> tokens
 *
 * Direct translation from reversed Q_/Dq flow.
 * Zero external MCP SDK dependency (KD-24).
 */
import { generatePKCE } from "../../oauth/pkce";
import type {
  AuthorizationServerMetadata,
  AuthResult,
  MCPAuthProvider,
  OAuthClientInfo,
  OAuthClientMetadata,
  OAuthTokens,
  ProtectedResourceMetadata,
} from "./types";

// ---------------------------------------------------------------------------
// Custom error types for retry logic
// Reversed: Gg, Vg, Kg
// ---------------------------------------------------------------------------
export class TokenError extends Error {
  name = "TokenError" as const;
}
export class CredentialError extends Error {
  name = "CredentialError" as const;
}
export class InvalidTokenError extends Error {
  name = "InvalidTokenError" as const;
}

// ---------------------------------------------------------------------------
// Parse WWW-Authenticate header from 401 response
// Reversed: ZD + wq
// ---------------------------------------------------------------------------

/**
 * Extract a single parameter value from a WWW-Authenticate header.
 * Supports both quoted and unquoted parameter values.
 * Translated from reversed wq function.
 */
function extractParam(header: string, param: string): string | undefined {
  const regex = new RegExp(`${param}=(?:"([^"]+)"|([^\\s,]+))`);
  const match = header.match(regex);
  if (match) return match[1] || match[2];
  return undefined;
}

/**
 * Parse WWW-Authenticate header from 401 response.
 * Translated from reversed ZD function.
 */
export function parseWWWAuthenticate(response: Response): {
  resourceMetadataUrl?: string;
  scope?: string;
  error?: string;
} {
  const header = response.headers.get("www-authenticate");
  if (!header) return {};

  // Split scheme from parameters
  const spaceIdx = header.indexOf(" ");
  const scheme = spaceIdx === -1 ? header : header.slice(0, spaceIdx);
  const params = spaceIdx === -1 ? "" : header.slice(spaceIdx + 1);

  if (scheme.toLowerCase() !== "bearer" || !params) return {};

  const resourceMetadata = extractParam(header, "resource_metadata");
  const scope = extractParam(header, "scope");
  const error = extractParam(header, "error");

  return {
    resourceMetadataUrl: resourceMetadata,
    scope,
    error,
  };
}

// ---------------------------------------------------------------------------
// Discover protected resource metadata (RFC 9728)
// Reversed: IyR
// ---------------------------------------------------------------------------
export async function discoverProtectedResource(
  resourceMetadataUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<ProtectedResourceMetadata> {
  const response = await fetchFn(resourceMetadataUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch protected resource metadata: ${response.status}`);
  }
  return (await response.json()) as ProtectedResourceMetadata;
}

// ---------------------------------------------------------------------------
// Discover authorization server metadata
// Tries .well-known/oauth-authorization-server first, then .well-known/openid-configuration
// Reversed: SyR + jyR + vyR
// ---------------------------------------------------------------------------
export async function discoverAuthorizationServer(
  serverUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<AuthorizationServerMetadata> {
  const url = new URL(serverUrl);

  // Build candidate well-known URLs (translated from jyR)
  const candidates: { url: string; type: string }[] = [];
  const pathname = url.pathname !== "/" ? url.pathname : "";
  const cleanPath = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  // Path-suffix mode: /.well-known/oauth-authorization-server{path}
  candidates.push({
    url: new URL(`/.well-known/oauth-authorization-server${cleanPath}`, url.origin).toString(),
    type: "oauth",
  });

  // OpenID discovery: /.well-known/openid-configuration{path}
  candidates.push({
    url: new URL(`/.well-known/openid-configuration${cleanPath}`, url.origin).toString(),
    type: "oidc",
  });

  // If there's a non-root path, also try prepend mode: {path}/.well-known/openid-configuration
  if (cleanPath) {
    candidates.push({
      url: new URL(`${cleanPath}/.well-known/openid-configuration`, url.origin).toString(),
      type: "oidc",
    });
  }

  for (const candidate of candidates) {
    try {
      const response = await fetchFn(candidate.url);
      if (response.ok) {
        return (await response.json()) as AuthorizationServerMetadata;
      }
      // 4xx errors -> skip to next candidate
      if (response.status >= 400 && response.status < 500) continue;
      // 5xx -> throw
      throw new Error(
        `HTTP ${response.status} trying to load authorization server metadata from ${candidate.url}`,
      );
    } catch (err) {
      // TypeError from fetch (network error) -> try next
      if (err instanceof TypeError) continue;
      throw err;
    }
  }

  throw new Error(`Failed to discover authorization server at ${serverUrl}`);
}

// ---------------------------------------------------------------------------
// Register client via Dynamic Client Registration (DCR)
// Reversed: LyR
// ---------------------------------------------------------------------------
export async function registerClient(
  metadata: AuthorizationServerMetadata,
  clientMetadata: OAuthClientMetadata,
  fetchFn: typeof fetch = fetch,
): Promise<OAuthClientInfo> {
  const endpoint = metadata.registration_endpoint;
  if (!endpoint) {
    throw new Error("Authorization server does not support dynamic client registration");
  }

  const response = await fetchFn(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(clientMetadata),
  });

  if (!response.ok) {
    throw new Error(`Client registration failed: ${response.status}`);
  }
  return (await response.json()) as OAuthClientInfo;
}

// ---------------------------------------------------------------------------
// Build authorization URL with PKCE
// Reversed: OyR
// ---------------------------------------------------------------------------
export async function buildAuthorizationUrl(
  metadata: AuthorizationServerMetadata,
  clientInfo: OAuthClientInfo,
  redirectUrl: string,
  scope?: string,
): Promise<{ url: URL; codeVerifier: string }> {
  const { verifier, challenge } = await generatePKCE();

  const url = new URL(metadata.authorization_endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientInfo.client_id);
  url.searchParams.set("redirect_uri", redirectUrl);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (scope) url.searchParams.set("scope", scope);

  return { url, codeVerifier: verifier };
}

// ---------------------------------------------------------------------------
// Exchange authorization code for tokens
// Reversed: CyR / YMT
// ---------------------------------------------------------------------------
export async function exchangeAuthorizationCode(
  metadata: AuthorizationServerMetadata,
  clientInfo: OAuthClientInfo,
  authorizationCode: string,
  codeVerifier: string,
  redirectUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: authorizationCode,
    redirect_uri: redirectUrl,
    client_id: clientInfo.client_id,
    code_verifier: codeVerifier,
  });
  if (clientInfo.client_secret) {
    body.set("client_secret", clientInfo.client_secret);
  }

  const response = await fetchFn(metadata.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new TokenError(`Token exchange failed: ${response.status}`);
  }
  return (await response.json()) as OAuthTokens;
}

// ---------------------------------------------------------------------------
// Refresh access token using refresh_token grant
// Reversed: EyR
// ---------------------------------------------------------------------------
export async function refreshAccessToken(
  metadata: AuthorizationServerMetadata,
  clientInfo: OAuthClientInfo,
  refreshToken: string,
  fetchFn: typeof fetch = fetch,
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientInfo.client_id,
  });
  if (clientInfo.client_secret) {
    body.set("client_secret", clientInfo.client_secret);
  }

  const response = await fetchFn(metadata.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new InvalidTokenError(`Token refresh failed: ${response.status}`);
  }
  return (await response.json()) as OAuthTokens;
}

// ---------------------------------------------------------------------------
// Main MCP OAuth auth flow orchestration
// Reversed: Q_ (retry wrapper) + Dq (core flow)
// ---------------------------------------------------------------------------

/**
 * Orchestrate the full MCP OAuth 2.0 PKCE auth flow.
 *
 * Flow:
 * 1. Discover protected resource metadata (if resourceMetadataUrl provided)
 * 2. Determine auth server URL
 * 3. Discover authorization server metadata
 * 4. Validate resource URL (if provider supports it)
 * 5. Get or register client
 * 6. If authorization code provided, exchange for tokens -> AUTHORIZED
 * 7. If refresh token available, refresh -> AUTHORIZED
 * 8. Otherwise, build auth URL and redirect -> REDIRECT
 *
 * Includes retry logic (translated from Q_):
 * - TokenError / CredentialError -> invalidate all, retry once
 * - InvalidTokenError -> invalidate tokens, retry once
 */
export async function auth(
  provider: MCPAuthProvider,
  options: {
    serverUrl: string;
    authorizationCode?: string;
    scope?: string;
    resourceMetadataUrl?: string;
    fetchFn?: typeof fetch;
  },
): Promise<AuthResult> {
  const fetchFn = options.fetchFn ?? fetch;

  try {
    return await _authFlow(provider, options, fetchFn);
  } catch (err) {
    // Retry on token/credential errors after invalidation (from Q_)
    if (err instanceof TokenError || err instanceof CredentialError) {
      await provider.invalidateCredentials?.("all");
      return await _authFlow(provider, options, fetchFn);
    }
    if (err instanceof InvalidTokenError) {
      await provider.invalidateCredentials?.("tokens");
      return await _authFlow(provider, options, fetchFn);
    }
    throw err;
  }
}

/** Core auth flow (translated from Dq). */
async function _authFlow(
  provider: MCPAuthProvider,
  options: {
    serverUrl: string;
    authorizationCode?: string;
    scope?: string;
    resourceMetadataUrl?: string;
  },
  fetchFn: typeof fetch,
): Promise<AuthResult> {
  // 1. Discover protected resource (if metadata URL provided)
  let resourceMetadata: ProtectedResourceMetadata | undefined;
  if (options.resourceMetadataUrl) {
    resourceMetadata = await discoverProtectedResource(options.resourceMetadataUrl, fetchFn);
  }

  // 2. Determine auth server URL
  const authServerUrl = resourceMetadata?.authorization_servers?.[0] ?? options.serverUrl;

  // 3. Discover authorization server metadata
  const serverMetadata = await discoverAuthorizationServer(authServerUrl, fetchFn);

  // 4. Validate resource URL if provider supports it
  if (provider.validateResourceURL && resourceMetadata?.resource) {
    const valid = await provider.validateResourceURL(resourceMetadata.resource);
    if (!valid) throw new Error("Resource URL validation failed");
  }

  // 5. Get or register client
  let clientInfo = await provider.clientInformation();
  if (!clientInfo) {
    // Check for client_id_metadata_document support (from reversed Dq)
    const supportsMetadataDoc = serverMetadata.client_id_metadata_document_supported === true;
    const metadataUrl = provider.clientMetadataUrl;

    if (supportsMetadataDoc && metadataUrl) {
      // Use metadata URL as client_id
      clientInfo = { client_id: metadataUrl };
      await provider.saveClientInformation(clientInfo);
    } else {
      // Dynamic client registration
      clientInfo = await registerClient(serverMetadata, provider.clientMetadata, fetchFn);
      await provider.saveClientInformation(clientInfo);
    }
  }

  // 6. If authorization code provided, exchange for tokens
  if (options.authorizationCode) {
    const codeVerifier = await provider.codeVerifier();
    const tokens = await exchangeAuthorizationCode(
      serverMetadata,
      clientInfo,
      options.authorizationCode,
      codeVerifier,
      provider.redirectUrl,
      fetchFn,
    );
    await provider.saveTokens(tokens);
    return "AUTHORIZED";
  }

  // 7. If refresh token available, try refresh
  const existingTokens = await provider.tokens();
  if (existingTokens?.refresh_token) {
    const tokens = await refreshAccessToken(
      serverMetadata,
      clientInfo,
      existingTokens.refresh_token,
      fetchFn,
    );
    await provider.saveTokens(tokens);
    return "AUTHORIZED";
  }

  // 8. Start authorization code flow with PKCE
  const scope =
    options.scope ?? resourceMetadata?.scopes_supported?.join(" ") ?? provider.clientMetadata.scope;
  const { url: authUrl, codeVerifier } = await buildAuthorizationUrl(
    serverMetadata,
    clientInfo,
    provider.redirectUrl,
    scope,
  );
  await provider.saveCodeVerifier(codeVerifier);
  await provider.redirectToAuthorization(authUrl);

  return "REDIRECT";
}
