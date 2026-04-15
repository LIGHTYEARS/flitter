function UU0(T) {
  return T.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}
function BRR(T) {
  return T.replace(/\[(image(?:\s+\d+)?)\]/gi, "").trim();
}
function HU0(T) {
  let R = ys.extname(T.sourcePath).toLowerCase();
  if (R.length > 0) return R;
  if (T.source.type === "base64") switch (T.source.mediaType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
  }
  return ".png";
}