// Module: path-2
// Original: buR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: util

// Module: buR (CJS)
(T, R) => {
  var {
      normalizeIPv6: a,
      normalizeIPv4: e,
      removeDotSegments: t,
      recomposeAuthority: r,
      normalizeComponentEncoding: h,
    } = puR(),
    i = _uR();
  function c(y, u) {
    if (typeof y === "string") y = o(m(y, u), u);
    else if (typeof y === "object") y = m(o(y, u), u);
    return y;
  }
  function s(y, u, P) {
    let k = Object.assign({ scheme: "null" }, P),
      x = A(m(y, k), m(u, k), k, !0);
    return o(x, { ...k, skipEscape: !0 });
  }
  function A(y, u, P, k) {
    let x = {};
    if (!k) ((y = m(o(y, P), P)), (u = m(o(u, P), P)));
    if (((P = P || {}), !P.tolerant && u.scheme))
      ((x.scheme = u.scheme),
        (x.userinfo = u.userinfo),
        (x.host = u.host),
        (x.port = u.port),
        (x.path = t(u.path || "")),
        (x.query = u.query));
    else {
      if (u.userinfo !== void 0 || u.host !== void 0 || u.port !== void 0)
        ((x.userinfo = u.userinfo),
          (x.host = u.host),
          (x.port = u.port),
          (x.path = t(u.path || "")),
          (x.query = u.query));
      else {
        if (!u.path)
          if (((x.path = y.path), u.query !== void 0)) x.query = u.query;
          else x.query = y.query;
        else {
          if (u.path.charAt(0) === "/") x.path = t(u.path);
          else {
            if (
              (y.userinfo !== void 0 ||
                y.host !== void 0 ||
                y.port !== void 0) &&
              !y.path
            )
              x.path = "/" + u.path;
            else if (!y.path) x.path = u.path;
            else x.path = y.path.slice(0, y.path.lastIndexOf("/") + 1) + u.path;
            x.path = t(x.path);
          }
          x.query = u.query;
        }
        ((x.userinfo = y.userinfo), (x.host = y.host), (x.port = y.port));
      }
      x.scheme = y.scheme;
    }
    return ((x.fragment = u.fragment), x);
  }
  function l(y, u, P) {
    if (typeof y === "string")
      ((y = unescape(y)), (y = o(h(m(y, P), !0), { ...P, skipEscape: !0 })));
    else if (typeof y === "object") y = o(h(y, !0), { ...P, skipEscape: !0 });
    if (typeof u === "string")
      ((u = unescape(u)), (u = o(h(m(u, P), !0), { ...P, skipEscape: !0 })));
    else if (typeof u === "object") u = o(h(u, !0), { ...P, skipEscape: !0 });
    return y.toLowerCase() === u.toLowerCase();
  }
  function o(y, u) {
    let P = {
        host: y.host,
        scheme: y.scheme,
        userinfo: y.userinfo,
        port: y.port,
        path: y.path,
        query: y.query,
        nid: y.nid,
        nss: y.nss,
        uuid: y.uuid,
        fragment: y.fragment,
        reference: y.reference,
        resourceName: y.resourceName,
        secure: y.secure,
        error: "",
      },
      k = Object.assign({}, u),
      x = [],
      f = i[(k.scheme || P.scheme || "").toLowerCase()];
    if (f && f.serialize) f.serialize(P, k);
    if (P.path !== void 0)
      if (!k.skipEscape) {
        if (((P.path = escape(P.path)), P.scheme !== void 0))
          P.path = P.path.split("%3A").join(":");
      } else P.path = unescape(P.path);
    if (k.reference !== "suffix" && P.scheme) x.push(P.scheme, ":");
    let v = r(P);
    if (v !== void 0) {
      if (k.reference !== "suffix") x.push("//");
      if ((x.push(v), P.path && P.path.charAt(0) !== "/")) x.push("/");
    }
    if (P.path !== void 0) {
      let g = P.path;
      if (!k.absolutePath && (!f || !f.absolutePath)) g = t(g);
      if (v === void 0) g = g.replace(/^\/\//u, "/%2F");
      x.push(g);
    }
    if (P.query !== void 0) x.push("?", P.query);
    if (P.fragment !== void 0) x.push("#", P.fragment);
    return x.join("");
  }
  var n = Array.from({ length: 127 }, (y, u) =>
    /[^!"$&'()*+,\-.;=_`a-z{}~]/u.test(String.fromCharCode(u)),
  );
  function p(y) {
    let u = 0;
    for (let P = 0, k = y.length; P < k; ++P)
      if (((u = y.charCodeAt(P)), u > 126 || n[u])) return !0;
    return !1;
  }
  var _ =
    /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
  function m(y, u) {
    let P = Object.assign({}, u),
      k = {
        scheme: void 0,
        userinfo: void 0,
        host: "",
        port: void 0,
        path: "",
        query: void 0,
        fragment: void 0,
      },
      x = y.indexOf("%") !== -1,
      f = !1;
    if (P.reference === "suffix")
      y = (P.scheme ? P.scheme + ":" : "") + "//" + y;
    let v = y.match(_);
    if (v) {
      if (
        ((k.scheme = v[1]),
        (k.userinfo = v[3]),
        (k.host = v[4]),
        (k.port = parseInt(v[5], 10)),
        (k.path = v[6] || ""),
        (k.query = v[7]),
        (k.fragment = v[8]),
        isNaN(k.port))
      )
        k.port = v[5];
      if (k.host) {
        let I = e(k.host);
        if (I.isIPV4 === !1) {
          let S = a(I.host);
          ((k.host = S.host.toLowerCase()), (f = S.isIPV6));
        } else ((k.host = I.host), (f = !0));
      }
      if (
        k.scheme === void 0 &&
        k.userinfo === void 0 &&
        k.host === void 0 &&
        k.port === void 0 &&
        k.query === void 0 &&
        !k.path
      )
        k.reference = "same-document";
      else if (k.scheme === void 0) k.reference = "relative";
      else if (k.fragment === void 0) k.reference = "absolute";
      else k.reference = "uri";
      if (
        P.reference &&
        P.reference !== "suffix" &&
        P.reference !== k.reference
      )
        k.error = k.error || "URI is not a " + P.reference + " reference.";
      let g = i[(P.scheme || k.scheme || "").toLowerCase()];
      if (!P.unicodeSupport && (!g || !g.unicodeSupport)) {
        if (
          k.host &&
          (P.domainHost || (g && g.domainHost)) &&
          f === !1 &&
          p(k.host)
        )
          try {
            k.host = URL.domainToASCII(k.host.toLowerCase());
          } catch (I) {
            k.error =
              k.error ||
              "Host's domain name can not be converted to ASCII: " + I;
          }
      }
      if (!g || (g && !g.skipNormalize)) {
        if (x && k.scheme !== void 0) k.scheme = unescape(k.scheme);
        if (x && k.host !== void 0) k.host = unescape(k.host);
        if (k.path) k.path = escape(unescape(k.path));
        if (k.fragment) k.fragment = encodeURI(decodeURIComponent(k.fragment));
      }
      if (g && g.parse) g.parse(k, P);
    } else k.error = k.error || "URI can not be parsed.";
    return k;
  }
  var b = {
    SCHEMES: i,
    normalize: c,
    resolve: s,
    resolveComponents: A,
    equal: l,
    serialize: o,
    parse: m,
  };
  ((R.exports = b), (R.exports.default = b), (R.exports.fastUri = b));
};
