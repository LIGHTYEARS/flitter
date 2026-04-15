function zuT(T) {
  if (typeof T !== "number") return;
  if (!Number.isInteger(T) || T < 1) return;
  return T;
}
function p2R(T, R) {
  if (!Array.isArray(T) || T.length === 0) return;
  let a = [];
  for (let e of T) {
    let t = zuT(e.startLine);
    if (!t) continue;
    let r = zuT(e.endLine) ?? t;
    if (r < t) continue;
    let h = typeof e.file === "string" ? e.file.trim() : void 0;
    if (!(h && h.length > 0 ? h : R)) continue;
    a.push({
      file: h && h.length > 0 ? h : void 0,
      startLine: t,
      endLine: r === t ? void 0 : r
    });
  }
  return a.length > 0 ? a : void 0;
}