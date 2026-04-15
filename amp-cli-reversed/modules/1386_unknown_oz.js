function oz(T, R, a, e = !1) {
  if (R.length === 0) return null;
  let t = qI(T, R, a, (s, A) => s === A, e);
  if (t !== -1) return {
    index: t,
    kind: "exact"
  };
  let r = qI(T, R, a, (s, A) => s.trimEnd() === A.trimEnd(), e);
  if (r !== -1) return {
    index: r,
    kind: "rstrip"
  };
  let h = qI(T, R, a, (s, A) => s.trim() === A.trim(), e);
  if (h !== -1) return {
    index: h,
    kind: "trim"
  };
  let i = qI(T, R, a, (s, A) => sz(s.trim()) === sz(A.trim()), e);
  if (i !== -1) return {
    index: i,
    kind: "unicode"
  };
  let c = qI(T, R, a, (s, A) => {
    let l = o => sz(o).replace(/\t/g, " ").trim().replace(/ +/g, " ");
    return l(s) === l(A);
  }, e);
  if (c !== -1) return {
    index: c,
    kind: "spaceCollapsed"
  };
  return null;
}