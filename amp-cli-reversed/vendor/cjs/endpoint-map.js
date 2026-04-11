// Module: endpoint-map
// Original: mc
// Type: CJS (RT wrapper)
// Exports: EndpointMap, endpointEqual, endpointHasAddress, endpointToString, isTcpSubchannelAddress, stringToSubchannelAddress, subchannelAddressEqual, subchannelAddressToString
// Category: util

// Module: mc (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.EndpointMap = void 0),
    (T.isTcpSubchannelAddress = a),
    (T.subchannelAddressEqual = e),
    (T.subchannelAddressToString = t),
    (T.stringToSubchannelAddress = h),
    (T.endpointEqual = i),
    (T.endpointToString = c),
    (T.endpointHasAddress = s));
  var R = qT("net");
  function a(o) {
    return "port" in o;
  }
  function e(o, n) {
    if (!o && !n) return !0;
    if (!o || !n) return !1;
    if (a(o)) return a(n) && o.host === n.host && o.port === n.port;
    else return !a(n) && o.path === n.path;
  }
  function t(o) {
    if (a(o))
      if ((0, R.isIPv6)(o.host)) return "[" + o.host + "]:" + o.port;
      else return o.host + ":" + o.port;
    else return o.path;
  }
  var r = 443;
  function h(o, n) {
    if ((0, R.isIP)(o))
      return { host: o, port: n !== null && n !== void 0 ? n : r };
    else return { path: o };
  }
  function i(o, n) {
    if (o.addresses.length !== n.addresses.length) return !1;
    for (let p = 0; p < o.addresses.length; p++)
      if (!e(o.addresses[p], n.addresses[p])) return !1;
    return !0;
  }
  function c(o) {
    return "[" + o.addresses.map(t).join(", ") + "]";
  }
  function s(o, n) {
    for (let p of o.addresses) if (e(p, n)) return !0;
    return !1;
  }
  function A(o, n) {
    if (o.addresses.length !== n.addresses.length) return !1;
    for (let p of o.addresses) {
      let _ = !1;
      for (let m of n.addresses)
        if (e(p, m)) {
          _ = !0;
          break;
        }
      if (!_) return !1;
    }
    return !0;
  }
  class l {
    constructor() {
      this.map = new Set();
    }
    get size() {
      return this.map.size;
    }
    getForSubchannelAddress(o) {
      for (let n of this.map) if (s(n.key, o)) return n.value;
      return;
    }
    deleteMissing(o) {
      let n = [];
      for (let p of this.map) {
        let _ = !1;
        for (let m of o) if (A(m, p.key)) _ = !0;
        if (!_) (n.push(p.value), this.map.delete(p));
      }
      return n;
    }
    get(o) {
      for (let n of this.map) if (A(o, n.key)) return n.value;
      return;
    }
    set(o, n) {
      for (let p of this.map)
        if (A(o, p.key)) {
          p.value = n;
          return;
        }
      this.map.add({ key: o, value: n });
    }
    delete(o) {
      for (let n of this.map)
        if (A(o, n.key)) {
          this.map.delete(n);
          return;
        }
    }
    has(o) {
      for (let n of this.map) if (A(o, n.key)) return !0;
      return !1;
    }
    clear() {
      this.map.clear();
    }
    *keys() {
      for (let o of this.map) yield o.key;
    }
    *values() {
      for (let o of this.map) yield o.value;
    }
    *entries() {
      for (let o of this.map) yield [o.key, o.value];
    }
  }
  T.EndpointMap = l;
};
