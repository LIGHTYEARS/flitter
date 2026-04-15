function inR(T, R) {
  if (!T && !R) return "file";
  return T;
}
function cnR(T, R) {
  switch (T) {
    case "https":
    case "http":
    case "file":
      if (!R) R = Rc;else if (R[0] !== Rc) R = Rc + R;
      break;
  }
  return R;
}
class zR {
  static isUri(T) {
    if (T instanceof zR) return !0;
    if (!T) return !1;
    let R = T;
    return typeof R.authority === "string" && typeof R.fragment === "string" && typeof R.path === "string" && typeof R.query === "string" && typeof R.scheme === "string" && typeof R.fsPath === "string" && typeof R.with === "function" && typeof R.toString === "function";
  }
  scheme;
  authority;
  path;
  query;
  fragment;
  platform;
  constructor(T, R, a, e, t, r = !1, h) {
    if (typeof T === "object") this.scheme = T.scheme || t3, this.authority = T.authority || t3, this.path = T.path || t3, this.query = T.query || t3, this.fragment = T.fragment || t3, this.platform = T.platform;else this.scheme = inR(T, r), this.authority = R || t3, this.path = cnR(this.scheme, a || t3), this.query = e || t3, this.fragment = t || t3, this.platform = h, eiT(this, r);
  }
  get fsPath() {
    return NdT(this, !1);
  }
  with(T) {
    if (!T) return this;
    let {
      scheme: R,
      authority: a,
      path: e,
      query: t,
      fragment: r,
      platform: h
    } = T;
    if (R === void 0) R = this.scheme;else if (R === null) R = t3;
    if (a === void 0) a = this.authority;else if (a === null) a = t3;
    if (e === void 0) e = this.path;else if (e === null) e = t3;
    if (t === void 0) t = this.query;else if (t === null) t = t3;
    if (r === void 0) r = this.fragment;else if (r === null) r = t3;
    if (h === void 0) h = this.platform;else if (h === null) h = void 0;
    if (R === this.scheme && a === this.authority && e === this.path && t === this.query && r === this.fragment && h === this.platform) return this;
    return new x_(R, a, e, t, r, !1, h);
  }
  static parse(T, R = !1) {
    let a = zdT.exec(T);
    if (!a) return new x_(t3, t3, t3, t3, t3);
    return new x_(a[2] || t3, _E(a[4] || t3), _E(a[5] || t3), _E(a[7] || t3), _E(a[9] || t3), R);
  }
  static file(T, R = hnR()) {
    let a = t3;
    if (R === "windows") T = T.replace(/\\/g, Rc);
    if (T[0] === Rc && T[1] === Rc) {
      let e = T.indexOf(Rc, 2);
      if (e === -1) a = T.substring(2), T = Rc;else a = T.substring(2, e), T = T.substring(e) || Rc;
    }
    return new x_("file", a, T, t3, t3, !1, R);
  }
  static from(T) {
    let R = new x_(T.scheme, T.authority, T.path, T.query, T.fragment, !0, T.platform);
    return eiT(R, !0), R;
  }
  toString(T = !1) {
    return u2(this, T);
  }
  toJSON() {
    return this;
  }
  static revive(T) {
    if (!T) return T;
    if (T instanceof zR) return T;
    let R = new x_(T),
      a = T;
    return R._formatted = a.external, R._fsPath = a._sep === BdT(R.platform) ? a.fsPath : null, R;
  }
}