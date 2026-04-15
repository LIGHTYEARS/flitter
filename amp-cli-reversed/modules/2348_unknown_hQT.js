function hQT(T, R, a, e) {
  let t = oj0(a),
    r = a.enter("emphasis"),
    h = a.createTracker(e),
    i = h.move(t),
    c = h.move(a.containerPhrasing(T, {
      after: t,
      before: i,
      ...h.current()
    })),
    s = c.charCodeAt(0),
    A = RB(e.before.charCodeAt(e.before.length - 1), s, t);
  if (A.inside) c = LA(s) + c.slice(1);
  let l = c.charCodeAt(c.length - 1),
    o = RB(e.after.charCodeAt(0), l, t);
  if (o.inside) c = c.slice(0, -1) + LA(l);
  let n = h.move(t);
  return r(), a.attentionEncodeSurroundingInfo = {
    after: o.outside,
    before: A.outside
  }, i + c + n;
}