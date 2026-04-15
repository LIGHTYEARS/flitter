function $IT(T, R) {
  return R.concat(T);
}
function kC0(T) {
  let R = {};
  for (let a of T) {
    let e = a.indexOf("=");
    if (e <= 0) throw Error(`Invalid --env format: ${a}. Expected KEY=VALUE`);
    let t = a.slice(0, e),
      r = a.slice(e + 1);
    if (t.trim() === "") throw Error(`Invalid --env format: ${a}. Expected KEY=VALUE`);
    if (r === "") throw Error(`Invalid --env format: ${a}. Expected KEY=VALUE`);
    R[t] = r;
  }
  return R;
}