function p5(T, R, a) {
  return G6T(), new File(T, R !== null && R !== void 0 ? R : "unknown_file", a);
}
function ldR(T) {
  return (typeof T === "object" && T !== null && ("name" in T && T.name && String(T.name) || "url" in T && T.url && String(T.url) || "filename" in T && T.filename && String(T.filename) || "path" in T && T.path && String(T.path)) || "").split(/[\\/]/).pop() || void 0;
}