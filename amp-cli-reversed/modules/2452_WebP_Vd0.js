function Vd0(T, R) {
  if (R === "image/png") return {
    success: !0,
    base64Png: T
  };
  if (R === "image/webp") return J.debug("WebP images cannot be previewed (no pure JS decoder)"), {
    success: !1,
    reason: "unsupported-format"
  };
  let a = Buffer.from(T, "base64");
  try {
    let e, t, r;
    switch (R) {
      case "image/jpeg":
        {
          J.debug("Converting JPEG to PNG for Kitty graphics");
          let i = Fd0.default.decode(a, {
            useTArray: !0
          });
          t = i.width, r = i.height, e = i.data;
          break;
        }
      case "image/gif":
        {
          J.debug("Converting GIF to PNG for Kitty graphics");
          let i = new Gd0.GifReader(a);
          t = i.width, r = i.height, e = new Uint8Array(t * r * 4), i.decodeAndBlitFrameRGBA(0, e);
          break;
        }
      default:
        return J.warn("Unsupported image format for Kitty graphics", {
          mediaType: R
        }), {
          success: !1,
          reason: "unsupported-format"
        };
    }
    let h = Kd0.default.encode([e.buffer], t, r, 0);
    return {
      success: !0,
      base64Png: Buffer.from(h).toString("base64")
    };
  } catch (e) {
    return J.error("Failed to convert image to PNG", {
      mediaType: R,
      error: e
    }), {
      success: !1,
      reason: "conversion-error"
    };
  }
}