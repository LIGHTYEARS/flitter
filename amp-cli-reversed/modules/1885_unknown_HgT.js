function HgT(T) {
  if (T.length <= 2) return T;
  let R = new Set(),
    a = T[0],
    e = T[1];
  for (let t = 2; t < T.length; t++) {
    let r = T[t],
      h = e.x - a.x,
      i = e.y - a.y,
      c = r.x - e.x,
      s = r.y - e.y;
    if (h === c && i === s) R.add(t - 1);
    a = e, e = r;
  }
  return T.filter((t, r) => !R.has(r));
}