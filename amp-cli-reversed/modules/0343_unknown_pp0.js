async function Ap0(T, R) {
  let a = await Qo(T, ["log", "-z", `--max-count=${ap0}`, "--format=%H%x00%s", `${R}..HEAD`]);
  if (!a) return [];
  return lp0(a);
}
async function pp0(T, R) {
  if (!R) return null;
  let a = await np0(T);
  if (!a) return null;
  let e = await Qo(T, ["rev-list", "--count", `${a.comparisonRef}..HEAD`]);
  if (!e) return null;
  let t = await Qo(T, ["rev-list", "--count", `HEAD..${a.comparisonRef}`]);
  if (!t) return null;
  let r = HkT(e);
  if (r === null) return null;
  let h = HkT(t);
  if (h === null) return null;
  return {
    baseRef: a.baseRef,
    comparisonRef: a.comparisonRef,
    baseRefHead: a.baseRefHead,
    aheadCount: r,
    behindCount: h
  };
}