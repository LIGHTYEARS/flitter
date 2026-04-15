function Y1(T, R) {
  if (T.length <= R) return T;
  return `${T.slice(0, R)}...<truncated>`;
}
function In0(T) {
  return T.replace(/\s+/g, " ").trim();
}
function gn0(T) {
  if (!T || typeof T !== "object") return [];
  let R = T.issues;
  return Array.isArray(R) ? R.slice(0, 5) : [];
}
function $n0(T) {
  if (T === void 0) return null;
  if (typeof T === "string") return JSON.stringify(T);
  if (typeof T === "number" || typeof T === "boolean" || T === null) return JSON.stringify(T);
  try {
    return Y1(JSON.stringify(T), 120);
  } catch {
    return Y1(String(T), 120);
  }
}