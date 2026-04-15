function Pj0(T) {
  if (Array.isArray(T)) return T;
  if (typeof T === "number") return [uj0, T];
  return T === null || T === void 0 ? iQT : [T];
}
function kj0(T, R, a, e) {
  let t, r, h;
  if (typeof R === "function" && typeof a !== "function") r = void 0, h = R, t = a;else r = R, h = a, t = e;
  cQT(T, r, i, t);
  function i(c, s) {
    let A = s[s.length - 1],
      l = A ? A.children.indexOf(c) : void 0;
    return h(c, l, A);
  }
}