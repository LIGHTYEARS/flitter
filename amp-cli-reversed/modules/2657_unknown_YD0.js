function ws(T, R, a, e) {
  let t;
  while ((t = T[R]) === " " || t === "\t" || !a && (t === `
` || t === "\r" && T[R + 1] === `
`)) R++;
  return e || t !== "#" ? R : ws(T, eW(T, R), a);
}
function YD0(T, R, a, e, t = !1) {
  if (!e) return R = yQ(T, R), R < 0 ? T.length : R;
  for (let r = R; r < T.length; r++) {
    let h = T[r];
    if (h === "#") r = yQ(T, r);else if (h === a) return r + 1;else if (h === e || t && (h === `
` || h === "\r" && T[r + 1] === `
`)) return r;
  }
  throw new A8("cannot find end of structure", {
    toml: T,
    ptr: R
  });
}