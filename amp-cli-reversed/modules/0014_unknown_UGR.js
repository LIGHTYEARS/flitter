function NGR(T) {
  return typeof T === "object" && T !== null && !Array.isArray(T) && typeof T.content === "string" && typeof T.encoding === "string";
}
function UGR(T) {
  if (Array.isArray(T)) return "directory";
  if (typeof T === "object" && T !== null) {
    let R = T.type;
    if (typeof R === "string") return R;
  }
  return "unsupported content";
}