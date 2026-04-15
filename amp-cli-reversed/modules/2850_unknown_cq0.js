function P9R(T) {
  return Boolean(T["~debug"] && typeof T["~debug"] === "object" && "showParallelAttribution" in T["~debug"] && T["~debug"].showParallelAttribution === !0);
}
function cq0(T) {
  let R = T.split(`
`).map(e => e.trim()).filter(e => e.length > 0 && !e.startsWith("%%"));
  if (R.length === 0) throw Error("Empty mermaid diagram");
  let a = R[0];
  if (/^stateDiagram(-v2)?\s*$/i.test(a)) return oq0(R);
  return sq0(R);
}