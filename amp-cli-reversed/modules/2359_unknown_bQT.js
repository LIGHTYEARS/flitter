function vj0(T, R, a) {
  return pQT(T, a) ? "<" : "[";
}
function bQT(T, R, a, e) {
  let t = T.referenceType,
    r = a.enter("linkReference"),
    h = a.enter("label"),
    i = a.createTracker(e),
    c = i.move("["),
    s = a.containerPhrasing(T, {
      before: c,
      after: "]",
      ...i.current()
    });
  c += i.move(s + "]["), h();
  let A = a.stack;
  a.stack = [], h = a.enter("reference");
  let l = a.safe(a.associationId(T), {
    before: c,
    after: "]",
    ...i.current()
  });
  if (h(), a.stack = A, r(), t === "full" || !s || s !== l) c += i.move(l + "]");else if (t === "shortcut") c = c.slice(0, -1);else c += i.move("]");
  return c;
}