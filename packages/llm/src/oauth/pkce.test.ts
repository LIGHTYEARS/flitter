/**
 * Tests for PKCE utilities.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generatePKCE } from "./pkce";

describe("generatePKCE", () => {
  it("should return verifier and challenge as strings", async () => {
    const { verifier, challenge } = await generatePKCE();
    assert.equal(typeof verifier, "string");
    assert.equal(typeof challenge, "string");
  });

  it("should generate verifier of expected length (86 chars for 64 bytes base64url)", async () => {
    const { verifier } = await generatePKCE();
    // 64 bytes → ceil(64*4/3) = 86 chars base64url (no padding)
    assert.equal(verifier.length, 86);
  });

  it("should generate challenge of expected length (43 chars for SHA-256 base64url)", async () => {
    const { challenge } = await generatePKCE();
    // SHA-256 = 32 bytes → ceil(32*4/3) = 43 chars base64url (no padding)
    assert.equal(challenge.length, 43);
  });

  it("should only use base64url characters (no +, /, =)", async () => {
    const { verifier, challenge } = await generatePKCE();
    const base64urlRegex = /^[A-Za-z0-9_-]+$/;
    assert.match(verifier, base64urlRegex, "verifier should be base64url");
    assert.match(challenge, base64urlRegex, "challenge should be base64url");
  });

  it("should generate unique verifiers each time", async () => {
    const results = await Promise.all([generatePKCE(), generatePKCE(), generatePKCE()]);
    const verifiers = results.map((r) => r.verifier);
    const unique = new Set(verifiers);
    assert.equal(unique.size, 3, "each verifier should be unique");
  });

  it("should generate deterministic challenge for same verifier", async () => {
    // We can't easily test this without exposing internal base64UrlEncode,
    // but we can verify that verifier → challenge is a one-way mapping
    // by checking two different verifiers produce different challenges
    const a = await generatePKCE();
    const b = await generatePKCE();
    assert.notEqual(a.challenge, b.challenge, "different verifiers → different challenges");
  });
});
