function cj0(T, R, a) {
  return (a ? "" : "    ") + T;
}
function trT(T) {
  let R = T.options.quote || '"';
  if (R !== '"' && R !== "'") throw Error("Cannot serialize title with `" + R + "` for `options.quote`, expected `\"`, or `'`");
  return R;
}
function sj0(T, R, a, e) {
  let t = trT(a),
    r = t === '"' ? "Quote" : "Apostrophe",
    h = a.enter("definition"),
    i = a.enter("label"),
    c = a.createTracker(e),
    s = c.move("[");
  if (s += c.move(a.safe(a.associationId(T), {
    before: s,
    after: "]",
    ...c.current()
  })), s += c.move("]: "), i(), !T.url || /[\0- \u007F]/.test(T.url)) i = a.enter("destinationLiteral"), s += c.move("<"), s += c.move(a.safe(T.url, {
    before: s,
    after: ">",
    ...c.current()
  })), s += c.move(">");else i = a.enter("destinationRaw"), s += c.move(a.safe(T.url, {
    before: s,
    after: T.title ? " " : `
`,
    ...c.current()
  }));
  if (i(), T.title) i = a.enter(`title${r}`), s += c.move(" " + t), s += c.move(a.safe(T.title, {
    before: s,
    after: t,
    ...c.current()
  })), s += c.move(t), i();
  return h(), s;
}