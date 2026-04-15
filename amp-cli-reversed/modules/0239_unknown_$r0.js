function $r0(T) {
  if (typeof T.ZodType.prototype.openapi < "u") return;
  T.ZodType.prototype.openapi = function (...R) {
    let {
        refId: a,
        metadata: e,
        options: t
      } = vr0(...R),
      r = e !== null && e !== void 0 ? e : {},
      {
        param: h
      } = r,
      i = NP(r, ["param"]),
      c = Ho.getMetadataFromRegistry(this),
      s = c !== null && c !== void 0 ? c : {},
      {
        _internal: A
      } = s,
      l = NP(s, ["_internal"]),
      o = Object.assign(Object.assign(Object.assign({}, A), t), a ? {
        refId: a
      } : void 0),
      n = Object.assign(Object.assign(Object.assign({}, l), i), (l === null || l === void 0 ? void 0 : l.param) || h ? {
        param: Object.assign(Object.assign({}, l === null || l === void 0 ? void 0 : l.param), h)
      } : void 0),
      p = new this.constructor(this._def);
    function _(b) {
      Ho.setMetadataInRegistry(b, Object.assign(Object.assign({}, Object.keys(o).length > 0 ? {
        _internal: o
      } : void 0), n));
    }
    if (_(p), No(p, "ZodLazy")) _(this);
    if (No(p, "ZodObject")) {
      let b = Ho.getMetadataFromRegistry(p),
        y = p.extend;
      p.extend = function (...u) {
        let P = y.apply(p, u),
          k = b !== null && b !== void 0 ? b : {},
          {
            _internal: x
          } = k,
          f = NP(k, ["_internal"]);
        return Ho.setMetadataInRegistry(P, {
          _internal: {
            extendedFrom: (x === null || x === void 0 ? void 0 : x.refId) ? {
              refId: x.refId,
              schema: p
            } : x === null || x === void 0 ? void 0 : x.extendedFrom
          }
        }), P.openapi(f);
      }, $o(p, "catchall");
    }
    $o(p, "optional"), $o(p, "nullable"), $o(p, "default"), $o(p, "transform"), $o(p, "refine"), $o(p, "length"), $o(p, "min"), $o(p, "max");
    let m = p.meta;
    return p.meta = function (...b) {
      let y = m.apply(this, b);
      if (b[0]) {
        let u = Ho.getMetadataFromInternalRegistry(this);
        if (u) Ho.setMetadataInRegistry(y, Object.assign(Object.assign({}, u), b[0]));
      }
      return y;
    }, p;
  };
}