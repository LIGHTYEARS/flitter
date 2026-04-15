function _QT(T, R, a, e) {
  let t = trT(a),
    r = t === '"' ? "Quote" : "Apostrophe",
    h = a.createTracker(e),
    i,
    c;
  if (pQT(T, a)) {
    let A = a.stack;
    a.stack = [], i = a.enter("autolink");
    let l = h.move("<");
    return l += h.move(a.containerPhrasing(T, {
      before: l,
      after: ">",
      ...h.current()
    })), l += h.move(">"), i(), a.stack = A, l;
  }
  i = a.enter("link"), c = a.enter("label");
  let s = h.move("[");
  if (s += h.move(a.containerPhrasing(T, {
    before: s,
    after: "](",
    ...h.current()
  })), s += h.move("]("), c(), !T.url && T.title || /[\0- \u007F]/.test(T.url)) c = a.enter("destinationLiteral"), s += h.move("<"), s += h.move(a.safe(T.url, {
    before: s,
    after: ">",
    ...h.current()
  })), s += h.move(">");else c = a.enter("destinationRaw"), s += h.move(a.safe(T.url, {
    before: s,
    after: T.title ? " " : ")",
    ...h.current()
  }));
  if (c(), T.title) c = a.enter(`title${r}`), s += h.move(" " + t), s += h.move(a.safe(T.title, {
    before: s,
    after: t,
    ...h.current()
  })), s += h.move(t), c();
  return s += h.move(")"), i(), s;
}