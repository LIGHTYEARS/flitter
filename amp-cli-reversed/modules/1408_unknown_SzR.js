function SzR(T, R) {
  if (!OzR(R)) return;
  if (T.length !== 2) return;
  let [a, e] = T;
  if (!a || !e) return;
  let t = vA(a.program),
    r = vA(e.program);
  if (t !== "rg" || r !== "rg") return;
  let h = qb(a),
    i = qb(e);
  if (!h || !i) return;
  if (h.includes("--files")) return {
    kind: "list",
    program: t,
    path: nM(h),
    isWriteLike: !1
  };
  let c = cw(i);
  if (!c) return {
    kind: "command",
    program: r,
    isWriteLike: !1
  };
  return {
    kind: "search",
    program: r,
    query: c,
    path: sw(h),
    isWriteLike: !1
  };
}