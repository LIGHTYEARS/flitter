function KER(T, R = {}) {
  let a = T,
    e = GER(R),
    t,
    r;
  if (typeof e.filter === "function") r = e.filter, a = r("", a);else if (yr(e.filter)) r = e.filter, t = r;
  let h = [];
  if (typeof a !== "object" || a === null) return "";
  let i = Q8T[e.arrayFormat],
    c = i === "comma" && e.commaRoundTrip;
  if (!t) t = Object.keys(a);
  if (e.sort) t.sort(e.sort);
  let s = new WeakMap();
  for (let o = 0; o < t.length; ++o) {
    let n = t[o];
    if (e.skipNulls && a[n] === null) continue;
    bNT(h, _NT(a[n], n, i, c, e.allowEmptyArrays, e.strictNullHandling, e.skipNulls, e.encodeDotInKeys, e.encode ? e.encoder : null, e.filter, e.sort, e.allowDots, e.serializeDate, e.format, e.formatter, e.encodeValuesOnly, e.charset, s));
  }
  let A = h.join(e.delimiter),
    l = e.addQueryPrefix === !0 ? "?" : "";
  if (e.charsetSentinel) if (e.charset === "iso-8859-1") l += "utf8=%26%2310003%3B&";else l += "utf8=%E2%9C%93&";
  return A.length > 0 ? l + A : "";
}