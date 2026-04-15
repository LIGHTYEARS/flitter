function Mr(T, R) {
  let a = KnR(T, R);
  return typeof a === "string" ? a : a.toString();
}
function KnR(T, R, a = !0) {
  if (!R) R = VnR();
  let {
      workspaceFolders: e,
      isWindows: t,
      homeDir: r
    } = R,
    h = typeof T === "string" ? zR.parse(T) : zR.from(T);
  if (e) for (let i of e) {
    let c = I8(i);
    if (MR.hasPrefix(h, c)) {
      let s = c.path.endsWith("/") ? c.path.slice(0, -1) : c.path,
        A = a && e && e.length >= 2 ? qA(c.path) + (t ? "\\" : "/") : "";
      return DW(A + h.path.slice(s.length + 1), t, h.scheme);
    }
  }
  if (h?.scheme === "file") {
    if (r) {
      let i = I8(r);
      if (MR.hasPrefix(h, i)) {
        let c = i.path.endsWith("/") ? i.path.slice(0, -1) : i.path,
          s = h.path.slice(c.length + 1);
        return DW("~" + (t ? "\\" : "/") + s, t, h.scheme);
      }
    }
    return DW(h.fsPath, t, h.scheme);
  }
  return h;
}