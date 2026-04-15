async function x40(T, R) {
  try {
    await R.set("session", T);
  } catch (a) {
    J.warn("Failed to save session state.", {
      error: a instanceof Error ? a.message : String(a)
    });
  }
}
function f40(T = {}) {
  return T.dataDir || T.fs ? yrT(T) : JZT;
}
async function iB(T, R = {}) {
  let a = f40(R),
    e = {
      ...Jk
    },
    t = dIT.catch(() => {
      return;
    }).then(async () => {
      let r = await PrT(R);
      e = {
        ...Jk,
        ...T(r)
      }, await x40(e, a);
    });
  return dIT = t.then(() => {
    return;
  }, () => {
    return;
  }), await t, e;
}