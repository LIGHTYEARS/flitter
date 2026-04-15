function u2(T, R) {
  let a = !R ? tiT : snR,
    e = "",
    {
      scheme: t,
      authority: r,
      path: h,
      query: i,
      fragment: c
    } = T;
  if (t) e += t, e += ":";
  if (r || t === "file") e += Rc, e += Rc;
  if (r) {
    let s = r.indexOf("@");
    if (s !== -1) {
      let A = r.substring(0, s);
      if (r = r.substring(s + 1), s = A.lastIndexOf(":"), s === -1) e += a(A, !1, !1);else e += a(A.substring(0, s), !1, !1), e += ":", e += a(A.substring(s + 1), !1, !0);
      e += "@";
    }
    if (r = r.toLowerCase(), s = r.lastIndexOf(":"), s === -1) e += a(r, !1, !0);else e += a(r.substring(0, s), !1, !0), e += r.substring(s);
  }
  if (h) {
    if (h.length >= 3 && h.charCodeAt(0) === 47 && h.charCodeAt(2) === 58) {
      let s = h.charCodeAt(1);
      if (s >= 65 && s <= 90) h = `/${String.fromCharCode(s + 32)}:${h.substring(3)}`;
    } else if (h.length >= 2 && h.charCodeAt(1) === 58) {
      let s = h.charCodeAt(0);
      if (s >= 65 && s <= 90) h = `${String.fromCharCode(s + 32)}:${h.substring(2)}`;
    }
    e += a(h, !0, !1);
  }
  if (i) e += "?", e += a(i, !1, !1);
  if (c) e += "#", e += !R ? tiT(c, !1, !1) : c;
  return e;
}