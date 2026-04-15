function gzR(T, R) {
  return `${R ?? fzR}\x00${T}`;
}
function uzT(T) {
  if (T.kind === "command") return;
  if (T.kind === "search") {
    if (!T.query) return;
    let R = T.path ? ` in ${T.path}` : "";
    return `Search "${T.query}"${R}`;
  }
  if (T.kind === "read") return czR(T);
  if (T.kind === "list") return `List ${T.path ?? "."}`;
  return;
}