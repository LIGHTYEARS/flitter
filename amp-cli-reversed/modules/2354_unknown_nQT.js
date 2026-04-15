function oQT(T) {
  return T.value || "";
}
function fj0() {
  return "<";
}
function nQT(T, R, a, e) {
  let t = trT(a),
    r = t === '"' ? "Quote" : "Apostrophe",
    h = a.enter("image"),
    i = a.enter("label"),
    c = a.createTracker(e),
    s = c.move("![");
  if (s += c.move(a.safe(T.alt, {
    before: s,
    after: "]",
    ...c.current()
  })), s += c.move("]("), i(), !T.url && T.title || /[\0- \u007F]/.test(T.url)) i = a.enter("destinationLiteral"), s += c.move("<"), s += c.move(a.safe(T.url, {
    before: s,
    after: ">",
    ...c.current()
  })), s += c.move(">");else i = a.enter("destinationRaw"), s += c.move(a.safe(T.url, {
    before: s,
    after: T.title ? " " : ")",
    ...c.current()
  }));
  if (i(), T.title) i = a.enter(`title${r}`), s += c.move(" " + t), s += c.move(a.safe(T.title, {
    before: s,
    after: t,
    ...c.current()
  })), s += c.move(t), i();
  return s += c.move(")"), h(), s;
}