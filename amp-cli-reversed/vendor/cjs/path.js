// Module: path
// Original: _uR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: util

// Module: _uR (CJS)
(T, R) => {
  var a = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu,
    e = /([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-.:;=@]|%[\da-f]{2})+)/iu;
  function t(P) {
    return typeof P.secure === "boolean"
      ? P.secure
      : String(P.scheme).toLowerCase() === "wss";
  }
  function r(P) {
    if (!P.host) P.error = P.error || "HTTP URIs must have a host.";
    return P;
  }
  function h(P) {
    let k = String(P.scheme).toLowerCase() === "https";
    if (P.port === (k ? 443 : 80) || P.port === "") P.port = void 0;
    if (!P.path) P.path = "/";
    return P;
  }
  function i(P) {
    return (
      (P.secure = t(P)),
      (P.resourceName = (P.path || "/") + (P.query ? "?" + P.query : "")),
      (P.path = void 0),
      (P.query = void 0),
      P
    );
  }
  function c(P) {
    if (P.port === (t(P) ? 443 : 80) || P.port === "") P.port = void 0;
    if (typeof P.secure === "boolean")
      ((P.scheme = P.secure ? "wss" : "ws"), (P.secure = void 0));
    if (P.resourceName) {
      let [k, x] = P.resourceName.split("?");
      ((P.path = k && k !== "/" ? k : void 0),
        (P.query = x),
        (P.resourceName = void 0));
    }
    return ((P.fragment = void 0), P);
  }
  function s(P, k) {
    if (!P.path) return ((P.error = "URN can not be parsed"), P);
    let x = P.path.match(e);
    if (x) {
      let f = k.scheme || P.scheme || "urn";
      ((P.nid = x[1].toLowerCase()), (P.nss = x[2]));
      let v = `${f}:${k.nid || P.nid}`,
        g = u[v];
      if (((P.path = void 0), g)) P = g.parse(P, k);
    } else P.error = P.error || "URN can not be parsed.";
    return P;
  }
  function A(P, k) {
    let x = k.scheme || P.scheme || "urn",
      f = P.nid.toLowerCase(),
      v = `${x}:${k.nid || f}`,
      g = u[v];
    if (g) P = g.serialize(P, k);
    let I = P,
      S = P.nss;
    return ((I.path = `${f || k.nid}:${S}`), (k.skipEscape = !0), I);
  }
  function l(P, k) {
    let x = P;
    if (
      ((x.uuid = x.nss),
      (x.nss = void 0),
      !k.tolerant && (!x.uuid || !a.test(x.uuid)))
    )
      x.error = x.error || "UUID is not valid.";
    return x;
  }
  function o(P) {
    let k = P;
    return ((k.nss = (P.uuid || "").toLowerCase()), k);
  }
  var n = { scheme: "http", domainHost: !0, parse: r, serialize: h },
    p = { scheme: "https", domainHost: n.domainHost, parse: r, serialize: h },
    _ = { scheme: "ws", domainHost: !0, parse: i, serialize: c },
    m = {
      scheme: "wss",
      domainHost: _.domainHost,
      parse: _.parse,
      serialize: _.serialize,
    },
    b = { scheme: "urn", parse: s, serialize: A, skipNormalize: !0 },
    y = { scheme: "urn:uuid", parse: l, serialize: o, skipNormalize: !0 },
    u = { http: n, https: p, ws: _, wss: m, urn: b, "urn:uuid": y };
  R.exports = u;
};
