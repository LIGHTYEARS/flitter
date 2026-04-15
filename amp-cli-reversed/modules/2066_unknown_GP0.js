function GP0(T, R) {
  if (!T || T.type !== "rgb") return "";
  let {
    r: a,
    g: e,
    b: t
  } = T.value;
  if (OXT(R) >= 24) return `\x1B[38;2;${a};${e};${t}m`;
  return `\x1B[38;5;${PtT(a, e, t)}m`;
}