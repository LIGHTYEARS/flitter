function ozR(T) {
  return T === "-n" || T === "--quiet" || T === "--silent" || /^-[^-]*n/.test(T);
}
function LuT(T) {
  if (!T) return;
  let R = T.split(";").map(a => nzR(a.trim())).filter(a => Boolean(a));
  if (R.length === 0) return;
  if (R.length === 1) return {
    readRange: R[0]
  };
  return {
    readRangeLabel: bzR(R)
  };
}