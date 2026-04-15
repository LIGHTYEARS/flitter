function Cj0(T, R, a, e) {
  let t = Ej0(a),
    r = a.bulletCurrent || rrT(a);
  if (R && R.type === "list" && R.ordered) r = (typeof R.start === "number" && R.start > -1 ? R.start : 1) + (a.options.incrementListMarker === !1 ? 0 : R.children.indexOf(T)) + r;
  let h = r.length + 1;
  if (t === "tab" || t === "mixed" && (R && R.type === "list" && R.spread || T.spread)) h = Math.ceil(h / 4) * 4;
  let i = a.createTracker(e);
  i.move(r + " ".repeat(h - r.length)), i.shift(h);
  let c = a.enter("listItem"),
    s = a.indentLines(a.containerFlow(T, i.current()), A);
  return c(), s;
  function A(l, o, n) {
    if (o) return (n ? "" : " ".repeat(h)) + l;
    return (n ? r : r + " ".repeat(h - r.length)) + l;
  }
}