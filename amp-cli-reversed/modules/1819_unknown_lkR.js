function lkR(T, R, a) {
  if (!T || !T.globs || T.globs.length === 0) return !0;
  a = I8(a);
  let e = R.map(t => I8(t));
  for (let t of T.globs) {
    let r = t;
    if (t.startsWith("./") || t.startsWith("../")) r = xD(MR.dirname(a).path, t);else if (!t.startsWith("/") && !t.startsWith("**/")) r = `**/${t}`;
    let h = YDT.default(r, {
      dot: !0
    });
    for (let i of e) if (h(Kt(i))) return !0;
  }
  return !1;
}