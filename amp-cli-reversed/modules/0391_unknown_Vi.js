function Vi(T, R) {
  if (R !== void 0) J.error(`[headless-dtw] ${T}`, {
    error: R
  });else J.error(`[headless-dtw] ${T}`);
  if (!htT) return;
  let a = oR.dim(`[${rtT()}]`),
    e = oR.red("[ERROR]"),
    t = itT(R);
  process.stderr.write(`${a} ${e} ${T} ${t}
`);
}