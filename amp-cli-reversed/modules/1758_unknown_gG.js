function ayR(T) {
  let R = globalThis.DOMException;
  return typeof R == "function" ? new R(T, "SyntaxError") : SyntaxError(T);
}
function gG(T) {
  return T instanceof Error ? "errors" in T && Array.isArray(T.errors) ? T.errors.map(gG).join(", ") : "cause" in T && T.cause instanceof Error ? `${T}: ${gG(T.cause)}` : T.message : `${T}`;
}