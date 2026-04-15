function Lx0(T, R) {
  if (T === void 0) return;
  if (R === void 0 || R === T) return `${T}`;
  return `${T}-${R}`;
}
function ifT(T) {
  if (typeof T !== "number" || !Number.isInteger(T) || T < 1) return;
  return T;
}
function Mx0(T) {
  let R = typeof T.file === "string" ? T.file.trim() : void 0,
    a = R && R.length > 0 ? R : void 0,
    e = [];
  if (Array.isArray(T.lineRanges)) for (let t of T.lineRanges) {
    if (!ye(t)) continue;
    let r = ifT(t.startLine);
    if (!r) continue;
    let h = ifT(t.endLine) ?? r;
    if (h < r) continue;
    let i = typeof t.file === "string" ? t.file.trim() : void 0,
      c = i && i.length > 0 ? i : a;
    e.push({
      file: c,
      startLine: r,
      endLine: h
    });
  }
  if (e.length > 0) return e;
  return [];
}