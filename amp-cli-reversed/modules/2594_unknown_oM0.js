function oM0() {
  let T = process.env.AMP_TOOLBOX;
  if (!T) return kj;
  let R = T.split(":").map(e => e.trim()).filter(Boolean),
    a = R.filter(e => !pJT.isAbsolute(e));
  if (a.length > 0) throw Error(`AMP_TOOLBOX must contain absolute paths only. Found relative paths: ${a.join(", ")}
See https://ampcode.com/manual#toolboxes`);
  return R[0] || kj;
}