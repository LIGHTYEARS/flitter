function ow(T) {
  if (typeof T !== "number") return;
  if (!Number.isInteger(T) || T < 1) return;
  return T;
}
function t2R(T) {
  return typeof T === "object" && T !== null;
}
function r2R(T) {
  if (!Array.isArray(T.lineRanges) || T.lineRanges.length === 0) return [];
  let R = typeof T.file === "string" && T.file.trim().length > 0 ? Jj(T.file) : void 0,
    a = [];
  for (let e of T.lineRanges) {
    if (!t2R(e)) continue;
    let t = ow(typeof e.startLine === "number" ? e.startLine : void 0);
    if (!t) continue;
    let r = ow(typeof e.endLine === "number" ? e.endLine : void 0) ?? t;
    if (r < t) continue;
    let h = typeof e.file === "string" && e.file.trim().length > 0 ? Jj(e.file) : R;
    if (!h) continue;
    a.push({
      file: h,
      startLine: t,
      endLine: r
    });
  }
  return a;
}