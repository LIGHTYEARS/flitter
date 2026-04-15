function xn0(T, R = {}) {
  let a = (R.mode ?? "lenient") === "strict";
  if (!Array.isArray(T)) return a ? null : [];
  let e = [];
  for (let t of T) {
    if (typeof t !== "object" || t === null) {
      if (a) return null;
      continue;
    }
    let r = t;
    if (typeof r.uri !== "string" || r.uri.length === 0) {
      if (a) return null;
      continue;
    }
    let h;
    try {
      h = d0(zR.parse(r.uri));
    } catch {
      if (a) return null;
      continue;
    }
    let i = {
      uri: h
    };
    if (typeof r.content === "string") i.content = r.content;
    if (typeof r.lineCount === "number" && Number.isFinite(r.lineCount)) i.lineCount = r.lineCount;
    if (typeof r.hash === "string") i.hash = r.hash;
    e.push(i);
  }
  return e;
}