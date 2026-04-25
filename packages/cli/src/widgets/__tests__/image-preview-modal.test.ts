/**
 * Tests for ImagePreviewModal and its helper functions.
 *
 * 逆向: misc_utils.js — formatMediaType, formatFileSize, extractFilename, ImagePreviewModal
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractFilename,
  formatFileSize,
  formatMediaType,
  ImagePreviewModal,
} from "../image-preview-modal.js";

// ─── formatMediaType ──────────────────────────────────────

describe("formatMediaType", () => {
  it("strips image/ prefix and uppercases for png", () => {
    assert.equal(formatMediaType("image/png"), "PNG");
  });

  it("strips image/ prefix and uppercases for jpeg", () => {
    assert.equal(formatMediaType("image/jpeg"), "JPEG");
  });

  it("strips image/ prefix for gif", () => {
    assert.equal(formatMediaType("image/gif"), "GIF");
  });

  it("strips image/ prefix for webp", () => {
    assert.equal(formatMediaType("image/webp"), "WEBP");
  });

  it("uppercases non-image media types without stripping", () => {
    assert.equal(formatMediaType("text/plain"), "TEXT/PLAIN");
  });

  it("uppercases application type without stripping", () => {
    assert.equal(formatMediaType("application/pdf"), "APPLICATION/PDF");
  });

  it("handles image/svg+xml", () => {
    assert.equal(formatMediaType("image/svg+xml"), "SVG+XML");
  });

  it("handles empty string", () => {
    assert.equal(formatMediaType(""), "");
  });
});

// ─── formatFileSize ───────────────────────────────────────

describe("formatFileSize", () => {
  it("returns bytes for zero", () => {
    assert.equal(formatFileSize(0), "0 bytes");
  });

  it("returns bytes for small values", () => {
    assert.equal(formatFileSize(500), "500 bytes");
  });

  it("returns bytes for 1023 (just under 1 KB)", () => {
    assert.equal(formatFileSize(1023), "1023 bytes");
  });

  it("returns KB for exactly 1024 bytes", () => {
    assert.equal(formatFileSize(1024), "1 KB");
  });

  it("rounds KB to nearest integer", () => {
    assert.equal(formatFileSize(1536), "2 KB");
  });

  it("returns KB for values under 1 MB", () => {
    assert.equal(formatFileSize(524288), "512 KB");
  });

  it("returns MB with one decimal for exactly 1 MB", () => {
    assert.equal(formatFileSize(1_048_576), "1.0 MB");
  });

  it("returns MB with one decimal for larger values", () => {
    assert.equal(formatFileSize(2_621_440), "2.5 MB");
  });

  it("returns 1 bytes for a single byte", () => {
    assert.equal(formatFileSize(1), "1 bytes");
  });
});

// ─── extractFilename ──────────────────────────────────────

describe("extractFilename", () => {
  it("extracts filename from Unix path", () => {
    assert.equal(extractFilename("/path/to/file.png"), "file.png");
  });

  it("extracts filename from relative path with slashes", () => {
    assert.equal(extractFilename("path/to/photo.jpg"), "photo.jpg");
  });

  it("extracts filename from URL", () => {
    assert.equal(extractFilename("https://example.com/img.jpg"), "img.jpg");
  });

  it("extracts filename from URL with nested path", () => {
    assert.equal(extractFilename("https://cdn.example.com/assets/images/logo.png"), "logo.png");
  });

  it("returns bare filename if no separator", () => {
    assert.equal(extractFilename("photo.png"), "photo.png");
  });

  it("handles URL with query string", () => {
    // URL parsing strips query from pathname, so last segment is the filename
    const result = extractFilename("https://example.com/img.jpg?w=100");
    assert.equal(result, "img.jpg");
  });
});

// ─── ImagePreviewModal ────────────────────────────────────

describe("ImagePreviewModal", () => {
  it("constructs with minimal config (onDismiss only)", () => {
    const widget = new ImagePreviewModal({
      onDismiss: () => {},
    });
    assert.ok(widget.config);
    assert.equal(typeof widget.config.onDismiss, "function");
  });

  it("stores filePath in config", () => {
    const widget = new ImagePreviewModal({
      filePath: "/tmp/image.png",
      onDismiss: () => {},
    });
    assert.equal(widget.config.filePath, "/tmp/image.png");
  });

  it("stores mediaType and fileSize in config", () => {
    const widget = new ImagePreviewModal({
      mediaType: "image/png",
      fileSize: 2048,
      onDismiss: () => {},
    });
    assert.equal(widget.config.mediaType, "image/png");
    assert.equal(widget.config.fileSize, 2048);
  });

  it("stores imageIndex in config", () => {
    const widget = new ImagePreviewModal({
      imageIndex: 3,
      onDismiss: () => {},
    });
    assert.equal(widget.config.imageIndex, 3);
  });

  it("stores onSave callback", () => {
    let saved = false;
    const widget = new ImagePreviewModal({
      onDismiss: () => {},
      onSave: () => {
        saved = true;
      },
    });
    assert.equal(typeof widget.config.onSave, "function");
    widget.config.onSave!();
    assert.equal(saved, true);
  });

  it("stores onRemove callback", () => {
    let removed = false;
    const widget = new ImagePreviewModal({
      onDismiss: () => {},
      onRemove: () => {
        removed = true;
      },
    });
    assert.equal(typeof widget.config.onRemove, "function");
    widget.config.onRemove!();
    assert.equal(removed, true);
  });

  it("onDismiss callback is callable", () => {
    let dismissed = false;
    const widget = new ImagePreviewModal({
      onDismiss: () => {
        dismissed = true;
      },
    });
    widget.config.onDismiss();
    assert.equal(dismissed, true);
  });

  it("is a StatefulWidget with createState", () => {
    const widget = new ImagePreviewModal({
      onDismiss: () => {},
    });
    assert.equal(typeof widget.createState, "function");
  });

  it("handles full config with all optional fields", () => {
    const widget = new ImagePreviewModal({
      filePath: "/images/photo.jpg",
      imageData: "base64data==",
      mediaType: "image/jpeg",
      fileSize: 1_048_576,
      imageIndex: 0,
      onDismiss: () => {},
      onSave: () => {},
      onRemove: () => {},
    });
    assert.equal(widget.config.filePath, "/images/photo.jpg");
    assert.equal(widget.config.imageData, "base64data==");
    assert.equal(widget.config.mediaType, "image/jpeg");
    assert.equal(widget.config.fileSize, 1_048_576);
    assert.equal(widget.config.imageIndex, 0);
    assert.equal(typeof widget.config.onSave, "function");
    assert.equal(typeof widget.config.onRemove, "function");
  });

  it("optional callbacks default to undefined", () => {
    const widget = new ImagePreviewModal({
      onDismiss: () => {},
    });
    assert.equal(widget.config.onSave, undefined);
    assert.equal(widget.config.onRemove, undefined);
    assert.equal(widget.config.filePath, undefined);
    assert.equal(widget.config.mediaType, undefined);
    assert.equal(widget.config.fileSize, undefined);
    assert.equal(widget.config.imageIndex, undefined);
    assert.equal(widget.config.imageData, undefined);
  });
});
