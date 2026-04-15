function tcT(T, R) {
  return R.some(a => E2(T, a));
}
async function LpR(T, R) {
  try {
    return await R.realpath(T);
  } catch {}
  let a = [],
    e = T;
  while (!0) {
    let t = MR.dirname(e);
    if (t.toString() === e.toString()) break;
    a.unshift(MR.basename(e)), e = t;
    try {
      let r = await R.realpath(e);
      for (let h of a) r = MR.joinPath(r, h);
      return r;
    } catch {}
  }
  return T;
}