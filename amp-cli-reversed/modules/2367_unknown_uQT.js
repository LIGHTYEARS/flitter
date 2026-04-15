function Lj0(T, R, a, e) {
  let t = a.enter("paragraph"),
    r = a.enter("phrasing"),
    h = a.containerPhrasing(T, e);
  return r(), t(), h;
}
function Dj0(T, R, a, e) {
  return (T.children.some(function (t) {
    return Mj0(t);
  }) ? a.containerPhrasing : a.containerFlow).call(a, T, e);
}
function wj0(T) {
  let R = T.options.strong || "*";
  if (R !== "*" && R !== "_") throw Error("Cannot serialize strong with `" + R + "` for `options.strong`, expected `*`, or `_`");
  return R;
}
function uQT(T, R, a, e) {
  let t = wj0(a),
    r = a.enter("strong"),
    h = a.createTracker(e),
    i = h.move(t + t),
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
  let n = h.move(t + t);
  return r(), a.attentionEncodeSurroundingInfo = {
    after: o.outside,
    before: A.outside
  }, i + c + n;
}