function IfR(T) {
  if (T.startsWith("/")) return !0;
  if (T.match(/^[A-Za-z]:[\\]/) || T.match(/^[A-Za-z]:[/]/)) return !0;
  return !1;
}
function gfR(T) {
  return ywT.includes(MR.basename(T));
}
function bb(T, R = "result") {
  if (T === null) return `<${R}>null</${R}>`;
  if (T === void 0) return `<${R}>undefined</${R}>`;
  if (typeof T === "string") return `<${R}>${T}</${R}>`;
  if (typeof T === "number" || typeof T === "boolean") return `<${R}>${T}</${R}>`;
  if (Array.isArray(T)) return `<${R}>${JSON.stringify(T)}</${R}>`;
  if (typeof T === "object") return Object.entries(T).map(([a, e]) => {
    if (typeof e === "object" && e !== null && !Array.isArray(e)) {
      let t = bb(e, a);
      return `<${a}>
${t}
</${a}>`;
    }
    return bb(e, a);
  }).join(`
`);
  return `<${R}>${String(T)}</${R}>`;
}