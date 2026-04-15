function Z2(T) {
  let R = [];
  if (R.push(T.action), T.action === "delegate" && T.to) R.push(`--to ${Ll(T.to)}`);
  if (T.action === "reject" && T.message) R.push(`--message ${Ll(T.message)}`);
  if (T.context) R.push(`--context ${T.context}`);
  if (R.push(Ll(T.tool)), T.matches) for (let [a, e] of Object.entries(T.matches)) {
    let t = xbR(a, e);
    R.push(...t);
  }
  return R.join(" ");
}