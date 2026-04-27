/**
 * image-transcoder 单元测试。
 *
 * 验证 transcodeToKittyPng 对各种图片格式的处理。
 *
 * @module
 */

import { describe, expect, it } from "bun:test";
import { transcodeToKittyPng } from "./image-transcoder.js";

// 最小有效 1x1 PNG (base64) — used as passthrough test
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// 最小有效 1x1 JPEG (base64) — generated via jpeg-js.encode({data:Buffer.alloc(4,255),width:1,height:1},100)
const TINY_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf/AABEIAAEAAQMBEQACEQEDEQH/xAGiAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgsQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+gEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoLEQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/AP7+KAP/2Q==";

describe("transcodeToKittyPng", () => {
  it("PNG passthrough returns input unchanged", () => {
    const result = transcodeToKittyPng(TINY_PNG_BASE64, "image/png");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.png).toBe(TINY_PNG_BASE64);
    }
  });

  it("JPEG transcodes to valid PNG", () => {
    const result = transcodeToKittyPng(TINY_JPEG_BASE64, "image/jpeg");
    expect(result.success).toBe(true);
    if (result.success) {
      // PNG magic bytes: 0x89504E47 → base64 starts with "iVBOR"
      expect(result.png.startsWith("iVBOR")).toBe(true);
    }
  });

  it("image/jpg also works", () => {
    const result = transcodeToKittyPng(TINY_JPEG_BASE64, "image/jpg");
    expect(result.success).toBe(true);
  });

  it("unknown format returns failure", () => {
    const result = transcodeToKittyPng("AAAA", "image/webp");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toContain("unsupported-format");
    }
  });

  it("invalid JPEG data returns error gracefully", () => {
    const result = transcodeToKittyPng("dGhpcyBpcyBub3QgYSBqcGVn", "image/jpeg");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toContain("transcode-error");
    }
  });

  it("empty base64 returns error for JPEG", () => {
    const result = transcodeToKittyPng("", "image/jpeg");
    expect(result.success).toBe(false);
  });
});
