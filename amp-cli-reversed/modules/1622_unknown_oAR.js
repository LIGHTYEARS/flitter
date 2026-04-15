function oAR(T, R) {
  let {
    filePath: a,
    line: e,
    column: t
  } = lAR(R);
  if (!a) return !1;
  let r = e ? `${a}:${e}${t ? `:${t}` : ""}` : a,
    h = dAR(T);
  if (!h) return LiT(T, a, e, t);
  if (jD(h, ["--goto", r], {
    stdio: "ignore"
  }).status === 0) return !0;
  return LiT(T, a, e, t);
}