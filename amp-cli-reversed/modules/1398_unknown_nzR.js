function nzR(T) {
  let R = /^(?<startLine>\d+)(?:,(?<endLine>\d+))?[pl]$/.exec(T);
  if (!R?.groups) return;
  let a = R.groups.startLine;
  if (!a) return;
  let e = R.groups.endLine ?? a,
    t = Number.parseInt(a, 10),
    r = Number.parseInt(e, 10);
  if (!Number.isInteger(t) || !Number.isInteger(r)) return;
  if (t < 1 || r < t) return;
  return [t, r];
}