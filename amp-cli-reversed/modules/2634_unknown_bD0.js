function v0(T, R) {
  let a = R ? ` ${JSON.stringify(R)}` : "";
  process.stderr.write(`[thread-pool] ${T}${a}
`);
}
function dJT(T, R) {
  process.stdout.write(`${JSON.stringify({
    type: "state",
    reason: T,
    state: R
  })}
`);
}
function J4(T, R) {
  process.stdout.write(`${JSON.stringify({
    type: T,
    ...R
  })}
`);
}
function _D0(T) {
  if (!T) return [];
  return bD0(T).map(R => R.trim()).filter(R => R.length > 0);
}
function bD0(T) {
  let R = [],
    a = "";
  for (let e of T) {
    if (e === ";" || e === `
`) {
      if (a) R.push(a), a = "";
      continue;
    }
    a += e;
  }
  if (a) R.push(a);
  return R;
}