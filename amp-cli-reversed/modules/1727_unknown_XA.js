function x9T(T) {
  try {
    let R = gLT(T);
    if (R.type) return MLT[R.type] ?? null;
    return null;
  } catch {
    return null;
  }
}
function XA(T) {
  let R = T.source.type === "base64" ? Buffer.from(T.source.data, "base64") : T.source.data,
    a = T.source.type === "file" ? T.source.path : void 0;
  if (R.length === 0) return a ? `Image file is empty (0 bytes): ${a}` : "Image file is empty (0 bytes)";
  if (R.length > zD) {
    let t = (zD / 1048576).toFixed(1),
      r = (R.length / 1048576).toFixed(1);
    if (T.source.type === "base64" && !a) return `Image too large: ${r}MB (max: ${t}MB)`;
    let h = `Image file too large: ${r}MB (max: ${t}MB)`;
    return a ? `${h} - ${a}` : h;
  }
  let e = mmR(R);
  if (e) {
    if (e.width > lq || e.height > lq) {
      let t = `Image dimensions too large: ${e.width}x${e.height}px (max ${lq}px per dimension)`;
      return a ? `${t} - ${a}` : t;
    }
  }
  return null;
}