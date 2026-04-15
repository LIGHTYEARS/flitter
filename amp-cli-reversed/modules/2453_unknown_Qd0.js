function pIT() {
  let T = zF;
  return zF = zF % 255 + 1, T;
}
function Yd0(T) {
  let R = orT.extname(T).toLowerCase();
  return Xd0.has(R);
}
function Qd0(T) {
  switch (orT.extname(T).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    default:
      return null;
  }
}