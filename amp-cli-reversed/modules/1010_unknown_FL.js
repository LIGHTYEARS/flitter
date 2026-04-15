function X$(T, R, a) {
  return gNT(), new File(T, R ?? "unknown_file", a);
}
function FL(T) {
  return (typeof T === "object" && T !== null && ("name" in T && T.name && String(T.name) || "url" in T && T.url && String(T.url) || "filename" in T && T.filename && String(T.filename) || "path" in T && T.path && String(T.path)) || "").split(/[\\/]/).pop() || void 0;
}