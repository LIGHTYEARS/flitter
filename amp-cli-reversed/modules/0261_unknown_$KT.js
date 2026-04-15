function $KT(T) {
  if (!Array.isArray(T) || T.length === 0) return null;
  let R = T.map(a => typeof a === "number" ? `[${a}]` : String(a)).join(".").replace(/\.\[/g, "[");
  return R.length > 0 ? R : null;
}