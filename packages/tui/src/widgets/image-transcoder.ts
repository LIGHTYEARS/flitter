/**
 * 图片格式转码器 — JPEG/GIF → PNG。
 *
 * Kitty Graphics Protocol 仅原生支持 PNG (f=100)。
 * 此模块将 JPEG/GIF 解码为 RGBA 像素后重新编码为 PNG。
 *
 * 逆向: amp module 2452_WebP_Vd0.js — decode/encode patterns
 *
 * @module
 */

import jpegJs from "jpeg-js";
// @ts-expect-error omggif has no type definitions
import { GifReader } from "omggif";
// @ts-expect-error upng-js has no type definitions
import UPNG from "upng-js";

/**
 * 转码结果。
 */
export type TranscodeResult = { success: true; png: string } | { success: false; reason: string };

/**
 * 将图片数据转码为 Kitty 可用的 PNG base64。
 *
 * 逆向: amp module 2452_WebP_Vd0.js — JPEG/GIF → PNG 转码管线
 *
 * @param base64 - 输入图片的 base64 编码
 * @param mediaType - MIME 类型 (image/png, image/jpeg, image/gif)
 * @returns TranscodeResult
 */
export function transcodeToKittyPng(base64: string, mediaType: string): TranscodeResult {
  try {
    switch (mediaType) {
      case "image/png":
        // PNG 直通 — Kitty 原生支持
        return { success: true, png: base64 };

      case "image/jpeg":
      case "image/jpg": {
        const buf = Buffer.from(base64, "base64");
        const decoded = jpegJs.decode(buf, { useTArray: true });
        const pngBuf = UPNG.encode(
          [decoded.data.buffer],
          decoded.width,
          decoded.height,
          0, // 0 = lossless PNG (no palette quantization)
        );
        return { success: true, png: Buffer.from(pngBuf).toString("base64") };
      }

      case "image/gif": {
        const buf = Buffer.from(base64, "base64");
        const reader = new GifReader(buf);
        const { width, height } = reader;
        const pixels = new Uint8Array(width * height * 4);
        reader.decodeAndBlitFrameRGBA(0, pixels); // 仅解码第一帧
        const pngBuf = UPNG.encode([pixels.buffer], width, height, 0);
        return { success: true, png: Buffer.from(pngBuf).toString("base64") };
      }

      default:
        return { success: false, reason: `unsupported-format: ${mediaType}` };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, reason: `transcode-error: ${message}` };
  }
}
