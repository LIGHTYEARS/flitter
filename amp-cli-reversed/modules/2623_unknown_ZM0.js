function ZM0(T, R, a) {
  if (a.size === 0) return new Set();
  let e = new Map((T.queuedMessages ?? []).map(h => {
      let i = RW(h);
      if (!i) return;
      return [i, h];
    }).filter(h => h !== void 0)),
    t = new Set(R.map(h => h.clientMessageID)),
    r = new Set();
  for (let h of a) {
    let i = e.get(h);
    if (!i) {
      if (t.has(h)) r.add(h);
      continue;
    }
    if (vrT(i)) continue;
    r.add(h);
  }
  return r;
}