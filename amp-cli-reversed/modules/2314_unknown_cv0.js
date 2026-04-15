function cv0(T, R, a) {
  let e = this,
    t = e.events.length,
    r,
    h;
  while (t--) if ((e.events[t][1].type === "labelImage" || e.events[t][1].type === "labelLink") && !e.events[t][1]._balanced) {
    r = e.events[t][1];
    break;
  }
  return i;
  function i(o) {
    if (!r) return a(o);
    if (r._inactive) return l(o);
    return h = e.parser.defined.includes(_c(e.sliceSerialize({
      start: r.end,
      end: e.now()
    }))), T.enter("labelEnd"), T.enter("labelMarker"), T.consume(o), T.exit("labelMarker"), T.exit("labelEnd"), c;
  }
  function c(o) {
    if (o === 40) return T.attempt(ev0, A, h ? A : l)(o);
    if (o === 91) return T.attempt(tv0, A, h ? s : l)(o);
    return h ? A(o) : l(o);
  }
  function s(o) {
    return T.attempt(rv0, A, l)(o);
  }
  function A(o) {
    return R(o);
  }
  function l(o) {
    return r._balanced = !0, a(o);
  }
}