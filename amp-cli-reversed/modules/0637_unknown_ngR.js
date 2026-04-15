function Du(T) {
  if (/^about:(blank|srcdoc)$/.test(T)) return !0;
  if (T.protocol === "data:") return !0;
  if (/^(blob|filesystem):$/.test(T.protocol)) return !0;
  return ogR(T);
}
function ngR(T, {
  referrerURLCallback: R,
  referrerOriginCallback: a
} = {}) {
  if (T.referrer === "no-referrer" || T.referrerPolicy === "") return null;
  let e = T.referrerPolicy;
  if (T.referrer === "about:client") return "no-referrer";
  let t = T.referrer,
    r = LAT(t),
    h = LAT(t, !0);
  if (r.toString().length > 4096) r = h;
  if (R) r = R(r);
  if (a) h = a(h);
  let i = new URL(T.url);
  switch (e) {
    case "no-referrer":
      return "no-referrer";
    case "origin":
      return h;
    case "unsafe-url":
      return r;
    case "strict-origin":
      if (Du(r) && !Du(i)) return "no-referrer";
      return h.toString();
    case "strict-origin-when-cross-origin":
      if (r.origin === i.origin) return r;
      if (Du(r) && !Du(i)) return "no-referrer";
      return h;
    case "same-origin":
      if (r.origin === i.origin) return r;
      return "no-referrer";
    case "origin-when-cross-origin":
      if (r.origin === i.origin) return r;
      return h;
    case "no-referrer-when-downgrade":
      if (Du(r) && !Du(i)) return "no-referrer";
      return r;
    default:
      throw TypeError(`Invalid referrerPolicy: ${e}`);
  }
}