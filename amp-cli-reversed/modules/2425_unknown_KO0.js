function zO0(T, R, a) {
  return _8(T, e, "whitespace");
  function e(t) {
    return t === null ? a(t) : R(t);
  }
}
function FO0(T) {
  return WYT([mO0(), vO0(), MO0(T), BO0(), WO0()]);
}
function KO0(T) {
  let R = this,
    a = T || GO0,
    e = R.data(),
    t = e.micromarkExtensions || (e.micromarkExtensions = []),
    r = e.fromMarkdownExtensions || (e.fromMarkdownExtensions = []),
    h = e.toMarkdownExtensions || (e.toMarkdownExtensions = []);
  t.push(FO0(a)), r.push(AO0()), h.push(pO0(a));
}