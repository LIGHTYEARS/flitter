/**
 * @flitter/llm -- MCP OAuth Types
 *
 * Types for MCP OAuth 2.0 PKCE authentication flow.
 * Translated from reversed mcp-oauth-schemas.js (qMT, $G, FMT, nlT, olT).
 * Zero external MCP SDK dependency (KD-24).
 */

// ---------------------------------------------------------------------------
// Protected Resource Metadata (RFC 9728)
// Reversed: qMT
// ---------------------------------------------------------------------------
export interface ProtectedResourceMetadata {
  resource: string;
  authorization_servers?: string[];
  bearer_methods_supported?: string[];
  resource_signing_alg_values_supported?: string[];
  scopes_supported?: string[];
}

// ---------------------------------------------------------------------------
// Authorization Server Metadata (RFC 8414)
// Reversed: $G
// ---------------------------------------------------------------------------
export interface AuthorizationServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  code_challenge_methods_supported?: string[];
  client_id_metadata_document_supported?: boolean;
  token_endpoint_auth_methods_supported?: string[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// OAuth Tokens
// Reversed: FMT
// ---------------------------------------------------------------------------
export interface OAuthTokens {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

// ---------------------------------------------------------------------------
// OAuth Client Info (from DCR response)
// Reversed: nlT
// ---------------------------------------------------------------------------
export interface OAuthClientInfo {
  client_id: string;
  client_secret?: string;
  client_id_issued_at?: number;
  client_secret_expires_at?: number;
}

// ---------------------------------------------------------------------------
// Client Metadata for Dynamic Client Registration
// Reversed: olT
// ---------------------------------------------------------------------------
export interface OAuthClientMetadata {
  redirect_uris: string[];
  client_name?: string;
  client_uri?: string;
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
  scope?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// MCP Auth Provider interface (used by transports)
// ---------------------------------------------------------------------------
export interface MCPAuthProvider {
  /** OAuth redirect URL */
  readonly redirectUrl: string;

  /** Client metadata for DCR */
  readonly clientMetadata: OAuthClientMetadata;

  /** Optional: client metadata URL (for client_id_metadata_document flow) */
  readonly clientMetadataUrl?: string;

  /** Get stored OAuth tokens */
  tokens(): Promise<OAuthTokens | undefined>;

  /** Save OAuth tokens */
  saveTokens(tokens: OAuthTokens): Promise<void>;

  /** Redirect user to authorization URL */
  redirectToAuthorization(url: URL): Promise<void>;

  /** Get stored code verifier */
  codeVerifier(): Promise<string>;

  /** Save code verifier */
  saveCodeVerifier(verifier: string): Promise<void>;

  /** Get stored client information */
  clientInformation(): Promise<OAuthClientInfo | undefined>;

  /** Save client information */
  saveClientInformation(info: OAuthClientInfo): Promise<void>;

  /** Invalidate stored credentials */
  invalidateCredentials?(scope: "all" | "tokens" | "client"): Promise<void>;

  /** Validate resource URL (optional security check) */
  validateResourceURL?(url: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Auth flow result
// ---------------------------------------------------------------------------
export type AuthResult = "AUTHORIZED" | "REDIRECT";
