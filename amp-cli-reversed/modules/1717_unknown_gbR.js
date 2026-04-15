function kLT(T) {
  return typeof Buffer < "u" && Buffer.isBuffer(T);
}
async function gbR(T, R, a, e) {
  let t = e?.maxBytes ?? 32768,
    r = e?.maxLines ?? 500,
    h = e?.maxLineBytes ?? 2048,
    i = await new y9T(T).readFile(R, {
      maxBytes: t,
      rejectBinary: !0,
      signal: a,
      textProcessing: {
        maxLines: r,
        maxLineBytes: h,
        truncationStrategy: "ellipsis"
      }
    });
  if (i.error) {
    J.debug("Failed to read file for mention", {
      uri: R
    }, i.error);
    return;
  }
  if (i.binary) return "binary";
  if (!i.content) return;
  if (i.truncated) {
    let c = Math.round(i.fileSize / 1024),
      s = Math.round(t / 1024);
    return `${i.content}

... [File truncated - showing first ${s}KB of ${c}KB total]`;
  }
  return i.content;
}