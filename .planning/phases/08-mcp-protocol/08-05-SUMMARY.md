---
phase: 8
plan: 05
status: complete
---

# MCP OAuth 2.0 PKCE Authentication -- Summary

## One-Liner
Implemented the full MCP OAuth 2.0 PKCE authentication flow including WWW-Authenticate parsing, protected resource and authorization server discovery, dynamic client registration, authorization URL building, token exchange/refresh, and orchestrated auth flow with retry logic.

## What Was Built
- `auth/types.ts` -- TypeScript interfaces for ProtectedResourceMetadata (RFC 9728), AuthorizationServerMetadata (RFC 8414), OAuthTokens, OAuthClientInfo, OAuthClientMetadata (for DCR), MCPAuthProvider interface (redirectUrl, clientMetadata, clientMetadataUrl, tokens/saveTokens, redirectToAuthorization, codeVerifier/saveCodeVerifier, clientInformation/saveClientInformation, invalidateCredentials, validateResourceURL), and AuthResult type
- `auth/oauth-provider.ts` -- parseWWWAuthenticate (extracts resource_metadata, scope, error from Bearer header), discoverProtectedResource (fetches resource metadata URL), discoverAuthorizationServer (tries .well-known/oauth-authorization-server with path-suffix, then .well-known/openid-configuration, then path-prepend mode), registerClient (POST to registration_endpoint), buildAuthorizationUrl (PKCE with generatePKCE from shared oauth/pkce.ts), exchangeAuthorizationCode (authorization_code grant), refreshAccessToken (refresh_token grant), and auth() orchestration function with retry wrapper for TokenError/CredentialError/InvalidTokenError
- `auth/oauth-provider.test.ts` -- 35 test cases using node:http createServer and custom fetch mocks
- Custom error types: TokenError, CredentialError, InvalidTokenError for retry classification

## Key Decisions
- Uses plain TypeScript interfaces rather than Zod schemas for metadata types, diverging from the plan's Zod approach to maintain zero-dependency simplicity
- PKCE generation reuses existing `packages/llm/src/oauth/pkce.ts` (generatePKCE) rather than reimplementing
- Well-known URL discovery tries three candidates in order: path-suffix oauth-authorization-server, origin-root openid-configuration, and path-prepend openid-configuration
- The auth() retry wrapper catches TokenError/CredentialError -> invalidates "all" credentials and retries, InvalidTokenError -> invalidates only "tokens" and retries
- Client registration supports client_id_metadata_document flow: when server has `client_id_metadata_document_supported: true` and provider has `clientMetadataUrl`, the URL is used directly as client_id without DCR
- Token exchange uses URL-encoded form body (application/x-www-form-urlencoded) per OAuth 2.0 spec, including client_secret when present
- Scope resolution order: explicit options.scope > resourceMetadata.scopes_supported (joined) > clientMetadata.scope

## Test Coverage
35 tests: parseWWWAuthenticate (6 tests -- full header, missing header, non-Bearer, scope-only, unquoted values, Bearer-no-params), discoverProtectedResource (2 tests -- success, 404 error), discoverAuthorizationServer (4 tests -- oauth-authorization-server, openid-configuration fallback, both-fail error, path-suffix mode), registerClient (3 tests -- success with body validation, no registration endpoint, failure status), buildAuthorizationUrl (3 tests -- PKCE params, scope omission, unique pairs), exchangeAuthorizationCode (3 tests -- success with param validation, client_secret inclusion, TokenError on failure), refreshAccessToken (2 tests -- success, InvalidTokenError on failure), auth() orchestration (8 tests -- full REDIRECT flow, code exchange AUTHORIZED, refresh token AUTHORIZED, TokenError retry with invalidation, protected resource metadata discovery, client_id_metadata_document, InvalidTokenError retry, resource URL validation rejection, scope priority), error types (3 tests).

## Artifacts
- `packages/llm/src/mcp/auth/types.ts`
- `packages/llm/src/mcp/auth/oauth-provider.ts`
- `packages/llm/src/mcp/auth/oauth-provider.test.ts`
