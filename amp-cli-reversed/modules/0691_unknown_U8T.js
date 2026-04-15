function dK(T) {
  return T !== null && T !== void 0 && typeof T === "object" && "parts" in T && Array.isArray(T.parts);
}
function HAT(T) {
  return T !== null && T !== void 0 && typeof T === "object" && "functionCall" in T;
}
function WAT(T) {
  return T !== null && T !== void 0 && typeof T === "object" && "functionResponse" in T;
}
function it(T) {
  if (T === null || T === void 0) throw Error("ContentUnion is required");
  if (dK(T)) return T;
  return {
    role: "user",
    parts: XBT(T)
  };
}
function U8T(T, R) {
  if (!R) return [];
  if (T.isVertexAI() && Array.isArray(R)) return R.flatMap(a => {
    let e = it(a);
    if (e.parts && e.parts.length > 0 && e.parts[0].text !== void 0) return [e.parts[0].text];
    return [];
  });else if (T.isVertexAI()) {
    let a = it(R);
    if (a.parts && a.parts.length > 0 && a.parts[0].text !== void 0) return [a.parts[0].text];
    return [];
  }
  if (Array.isArray(R)) return R.map(a => it(a));
  return [it(R)];
}