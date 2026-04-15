function ie(T, R) {
  if (R) J.info(`[headless-dtw] ${T}`, R);else J.info(`[headless-dtw] ${T}`);
  if (!htT) return;
  let a = oR.dim(`[${rtT()}]`),
    e = oR.cyan("[INFO]"),
    t = R ? ` ${itT(R)}` : "";
  process.stderr.write(`${a} ${e} ${T}${t}
`);
}