/**
 * vertex-auth.test.ts — Vertex AI authentication config tests
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveVertexAIConfig } from "./provider.js";

describe("resolveVertexAIConfig", () => {
  it("returns null when neither project nor location is set", () => {
    const result = resolveVertexAIConfig({});
    assert.equal(result, null);
  });

  it("returns null when only project is set (no location)", () => {
    const result = resolveVertexAIConfig({ "vertexai.project": "my-project" });
    assert.equal(result, null);
  });

  it("returns null when only location is set (no project)", () => {
    const result = resolveVertexAIConfig({ "vertexai.location": "us-central1" });
    assert.equal(result, null);
  });

  it("returns config when both project and location are set via vertexai.* keys", () => {
    const result = resolveVertexAIConfig({
      "vertexai.project": "my-project",
      "vertexai.location": "us-central1",
    });

    assert.ok(result);
    assert.equal(result.project, "my-project");
    assert.equal(result.location, "us-central1");
    assert.equal(result.serviceAccountKeyFile, undefined);
  });

  it("returns config when project and location are set via google.* keys", () => {
    const result = resolveVertexAIConfig({
      "google.project": "gcp-project",
      "google.location": "europe-west1",
    });

    assert.ok(result);
    assert.equal(result.project, "gcp-project");
    assert.equal(result.location, "europe-west1");
  });

  it("prefers vertexai.* keys over google.* keys", () => {
    const result = resolveVertexAIConfig({
      "vertexai.project": "vertex-project",
      "vertexai.location": "vertex-location",
      "google.project": "google-project",
      "google.location": "google-location",
    });

    assert.ok(result);
    assert.equal(result.project, "vertex-project");
    assert.equal(result.location, "vertex-location");
  });

  it("includes serviceAccountKeyFile when provided", () => {
    const result = resolveVertexAIConfig({
      "vertexai.project": "my-project",
      "vertexai.location": "us-central1",
      "vertexai.serviceAccountKeyFile": "/path/to/key.json",
    });

    assert.ok(result);
    assert.equal(result.serviceAccountKeyFile, "/path/to/key.json");
  });

  it("falls back from vertexai.project to google.project", () => {
    const result = resolveVertexAIConfig({
      "google.project": "fallback-project",
      "vertexai.location": "us-central1",
    });

    assert.ok(result);
    assert.equal(result.project, "fallback-project");
    assert.equal(result.location, "us-central1");
  });
});
