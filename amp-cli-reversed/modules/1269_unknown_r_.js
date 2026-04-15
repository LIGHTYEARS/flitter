function r_(T, R, a) {
  if (!a.formattingOptions) return [R];
  let e = EX(T, R),
    t = R.offset,
    r = R.offset + R.content.length;
  if (R.length === 0 || R.content.length === 0) {
    while (t > 0 && !ew(e, t - 1)) t--;
    while (r < e.length && !ew(e, r)) r++;
  }
  let h = JUR(e, {
    offset: t,
    length: r - t
  }, {
    ...a.formattingOptions,
    keepLines: !1
  });
  for (let c = h.length - 1; c >= 0; c--) {
    let s = h[c];
    e = EX(e, s), t = Math.min(t, s.offset), r = Math.max(r, s.offset + s.length), r += s.content.length - s.length;
  }
  let i = T.length - (e.length - r) - t;
  return [{
    offset: t,
    length: i,
    content: e.substring(t, r)
  }];
}