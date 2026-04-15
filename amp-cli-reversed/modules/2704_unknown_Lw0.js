function Lw0(T, R) {
  let {
      textNodeName: a
    } = R,
    e = Object.keys(T).length;
  if (e === 0) return !0;
  if (e === 1 && (T[a] || typeof T[a] === "boolean" || T[a] === 0)) return !0;
  return !1;
}