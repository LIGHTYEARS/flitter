function wq(T, R) {
  let a = T.headers.get("WWW-Authenticate");
  if (!a) return null;
  let e = new RegExp(`${R}=(?:"([^"]+)"|([^\\s,]+))`),
    t = a.match(e);
  if (t) return t[1] || t[2];
  return null;
}