function RS(T) {
  if (!T.trim()) return [];
  let R = T.split(/\r?\n/u),
    a = [],
    e,
    t;
  for (let r = 0; r < R.length; r += 1) {
    let h = R[r] ?? "";
    if (h.startsWith("diff --git ")) {
      let _ = h2R(h);
      if (_) e = _.oldFile, t = _.newFile;
      continue;
    }
    if (h.startsWith("--- ")) {
      e = ab(h.slice(4));
      continue;
    }
    if (h.startsWith("+++ ")) {
      t = ab(h.slice(4));
      continue;
    }
    let i = i2R(h);
    if (!i) continue;
    let c = [h],
      s = r + 1;
    while (s < R.length) {
      let _ = R[s] ?? "",
        m = R[s + 1] ?? "";
      if (_.startsWith("diff --git ") || _.startsWith("@@ ")) break;
      if (_.startsWith("--- ") && m.startsWith("+++ ")) break;
      c.push(_), s += 1;
    }
    r = s - 1;
    let A = e ? ab(e) : void 0,
      l = t ? ab(t) : void 0,
      o = c2R(A, l);
    if (!o) continue;
    let n = A ?? "/dev/null",
      p = l ?? "/dev/null";
    a.push({
      file: o,
      oldFile: n,
      newFile: p,
      oldStartLine: i.oldStartLine,
      oldLineCount: i.oldLineCount,
      newStartLine: i.newStartLine,
      newLineCount: i.newLineCount,
      diff: [`--- ${quT(n, "old")}`, `+++ ${quT(p, "new")}`, ...c].join(`
`)
    });
  }
  return a;
}