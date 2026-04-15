async function cp0(T, R, a = Qx) {
  return qP(T, [...SM, "--no-index", "--", RY, R], {
    allowExitCodeOne: !0,
    maxBufferBytes: a
  });
}
async function sp0(T, R, a, e = Qx) {
  let t = a ?? "HEAD";
  try {
    return await qP(T, ["show", `${t}:${R}`], {
      maxBufferBytes: e
    });
  } catch {
    return;
  }
}
async function op0(T, R, a = Qx) {
  try {
    let e = zA0(T, R);
    if ((await WA0(e)).size > a) return;
    return await HA0(e, "utf-8");
  } catch {
    return;
  }
}
function HkT(T) {
  let R = Number.parseInt(T.trim(), 10);
  if (!Number.isFinite(R)) return null;
  return R;
}
async function np0(T) {
  let R = (await Qo(T, ["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"]))?.trim();
  if (!R?.startsWith(BkT)) return null;
  let a = R.slice(BkT.length);
  if (!a) return null;
  let e = `origin/${a}`,
    t = (await Qo(T, ["rev-parse", "--verify", "--quiet", `${e}^{commit}`]))?.trim();
  if (!t) return null;
  return {
    baseRef: a,
    comparisonRef: e,
    baseRefHead: t
  };
}