function UAR(T) {
  let {
    filePath: R,
    line: a,
    column: e
  } = HAR(T);
  if (!R) return !1;
  let t = a ? `${R}:${a}${e ? `:${e}` : ""}` : R,
    r = QAR();
  if (!r) return !1;
  return fCT(r, [t], {
    stdio: "ignore"
  }).status === 0;
}