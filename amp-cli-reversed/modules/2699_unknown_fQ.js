function sb(T, R, a, e) {
  let t = T.indexOf(R, a);
  if (t === -1) throw Error(e);else return t + R.length - 1;
}
function fQ(T, R, a, e = ">") {
  let t = Sw0(T, R + 1, e);
  if (!t) return;
  let {
      data: r,
      index: h
    } = t,
    i = r.search(/\s/),
    c = r,
    s = !0;
  if (i !== -1) c = r.substring(0, i), r = r.substring(i + 1).trimStart();
  let A = c;
  if (a) {
    let l = c.indexOf(":");
    if (l !== -1) c = c.substr(l + 1), s = c !== t.data.substr(l + 1);
  }
  return {
    tagName: c,
    tagExp: r,
    closeIndex: h,
    attrExpPresent: s,
    rawTagName: A
  };
}