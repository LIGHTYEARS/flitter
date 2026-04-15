function EIR(T) {
  if (!/^data:/i.test(T)) throw TypeError('`uri` does not appear to be a Data URI (must begin with "data:")');
  T = T.replace(/\r?\n/g, "");
  let R = T.indexOf(",");
  if (R === -1 || R <= 4) throw TypeError("malformed data: URI");
  let a = T.substring(5, R).split(";"),
    e = "",
    t = !1,
    r = a[0] || "text/plain",
    h = r;
  for (let A = 1; A < a.length; A++) if (a[A] === "base64") t = !0;else if (a[A]) {
    if (h += `;${a[A]}`, a[A].indexOf("charset=") === 0) e = a[A].substring(8);
  }
  if (!a[0] && !e.length) h += ";charset=US-ASCII", e = "US-ASCII";
  let i = t ? "base64" : "ascii",
    c = unescape(T.substring(R + 1)),
    s = Buffer.from(c, i);
  return s.type = r, s.typeFull = h, s.charset = e, s;
}