// Module: ajv-keyword-PuR
// Original: PuR
// Type: CJS (RT wrapper)
// Exports: default
// Category: util

// Module: puR (CJS)
(T, R) => {
  var { HEX: a } = AuR(),
    e =
      /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u;
  function t(b) {
    if (s(b, ".") < 3) return { host: b, isIPV4: !1 };
    let y = b.match(e) || [],
      [u] = y;
    if (u) return { host: c(u, "."), isIPV4: !0 };
    else return { host: b, isIPV4: !1 };
  }
  function r(b, y = !1) {
    let u = "",
      P = !0;
    for (let k of b) {
      if (a[k] === void 0) return;
      if (k !== "0" && P === !0) P = !1;
      if (!P) u += k;
    }
    if (y && u.length === 0) u = "0";
    return u;
  }
  function h(b) {
    let y = 0,
      u = { error: !1, address: "", zone: "" },
      P = [],
      k = [],
      x = !1,
      f = !1,
      v = !1;
    function g() {
      if (k.length) {
        if (x === !1) {
          let I = r(k);
          if (I !== void 0) P.push(I);
          else return ((u.error = !0), !1);
        }
        k.length = 0;
      }
      return !0;
    }
    for (let I = 0; I < b.length; I++) {
      let S = b[I];
      if (S === "[" || S === "]") continue;
      if (S === ":") {
        if (f === !0) v = !0;
        if (!g()) break;
        if ((y++, P.push(":"), y > 7)) {
          u.error = !0;
          break;
        }
        if (I - 1 >= 0 && b[I - 1] === ":") f = !0;
        continue;
      } else if (S === "%") {
        if (!g()) break;
        x = !0;
      } else {
        k.push(S);
        continue;
      }
    }
    if (k.length)
      if (x) u.zone = k.join("");
      else if (v) P.push(k.join(""));
      else P.push(r(k));
    return ((u.address = P.join("")), u);
  }
  function i(b) {
    if (s(b, ":") < 2) return { host: b, isIPV6: !1 };
    let y = h(b);
    if (!y.error) {
      let { address: u, address: P } = y;
      if (y.zone) ((u += "%" + y.zone), (P += "%25" + y.zone));
      return { host: u, escapedHost: P, isIPV6: !0 };
    } else return { host: b, isIPV6: !1 };
  }
  function c(b, y) {
    let u = "",
      P = !0,
      k = b.length;
    for (let x = 0; x < k; x++) {
      let f = b[x];
      if (f === "0" && P) {
        if ((x + 1 <= k && b[x + 1] === y) || x + 1 === k) ((u += f), (P = !1));
      } else {
        if (f === y) P = !0;
        else P = !1;
        u += f;
      }
    }
    return u;
  }
  function s(b, y) {
    let u = 0;
    for (let P = 0; P < b.length; P++) if (b[P] === y) u++;
    return u;
  }
  var A = /^\.\.?\//u,
    l = /^\/\.(?:\/|$)/u,
    o = /^\/\.\.(?:\/|$)/u,
    n = /^\/?(?:.|\n)*?(?=\/|$)/u;
  function p(b) {
    let y = [];
    while (b.length)
      if (b.match(A)) b = b.replace(A, "");
      else if (b.match(l)) b = b.replace(l, "/");
      else if (b.match(o)) ((b = b.replace(o, "/")), y.pop());
      else if (b === "." || b === "..") b = "";
      else {
        let u = b.match(n);
        if (u) {
          let P = u[0];
          ((b = b.slice(P.length)), y.push(P));
        } else throw Error("Unexpected dot segment condition");
      }
    return y.join("");
  }
  function _(b, y) {
    let u = y !== !0 ? escape : unescape;
    if (b.scheme !== void 0) b.scheme = u(b.scheme);
    if (b.userinfo !== void 0) b.userinfo = u(b.userinfo);
    if (b.host !== void 0) b.host = u(b.host);
    if (b.path !== void 0) b.path = u(b.path);
    if (b.query !== void 0) b.query = u(b.query);
    if (b.fragment !== void 0) b.fragment = u(b.fragment);
    return b;
  }
  function m(b) {
    let y = [];
    if (b.userinfo !== void 0) (y.push(b.userinfo), y.push("@"));
    if (b.host !== void 0) {
      let u = unescape(b.host),
        P = t(u);
      if (P.isIPV4) u = P.host;
      else {
        let k = i(P.host);
        if (k.isIPV6 === !0) u = `[${k.escapedHost}]`;
        else u = b.host;
      }
      y.push(u);
    }
    if (typeof b.port === "number" || typeof b.port === "string")
      (y.push(":"), y.push(String(b.port)));
    return y.length ? y.join("") : void 0;
  }
  R.exports = {
    recomposeAuthority: m,
    normalizeComponentEncoding: _,
    removeDotSegments: p,
    normalizeIPv4: t,
    normalizeIPv6: i,
    stringArrayToHexStripped: r,
  };
};
