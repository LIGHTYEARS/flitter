async function NuT(T, R, a, e) {
  try {
    if (!(await T.stat(a))?.isDirectory) return;
    let t = await mFR(T, a, e);
    for (let r of t) if (!R.has(r.name)) R.set(r.name, r);
  } catch {}
}
function _FR(T) {
  if (!T) return [];
  let R = MR.joinPath(T, nFR),
    a = MR.joinPath(T, lFR);
  return [{
    checksDir: MR.joinPath(R, NX),
    scopeDir: {
      type: "global"
    }
  }, {
    checksDir: MR.joinPath(a, NX),
    scopeDir: {
      type: "global"
    }
  }];
}