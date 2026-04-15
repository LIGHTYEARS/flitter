function MP0(T) {
  let R = T.trimStart(),
    a = R.toLowerCase().startsWith("live-sync:") ? R.slice(10).trimStart() : T;
  return dXT(a);
}
function Nw(T, R) {
  let a = dXT(T),
    e = FxT(a) ? UP0(a, R) : a;
  if (!OH(R)) return e;
  if (a === kXT) return DP0(a);
  if (BP0(a)) return oR.yellow(a);
  if (NP0(a)) return oR.redBright(a);
  if (FxT(a)) return oR.greenBright(e);
  if (HP0(a)) return wP0(a);
  if (WP0(a)) return oR.dim(a);
  if (qP0(a)) return oR.cyanBright(a);
  return a;
}