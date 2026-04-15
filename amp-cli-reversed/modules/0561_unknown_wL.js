function OP(T, R, a) {
  return V7T(), new File(T, R ?? "unknown_file", a);
}
function wL(T, R) {
  let a = typeof T === "object" && T !== null && ("name" in T && T.name && String(T.name) || "url" in T && T.url && String(T.url) || "filename" in T && T.filename && String(T.filename) || "path" in T && T.path && String(T.path)) || "";
  return R ? a.split(/[\\/]/).pop() || void 0 : a;
}