// Module: metadata
// Original: Yt
// Type: CJS (RT wrapper)
// Exports: Metadata
// Category: util

// Module: Yt (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.Metadata = void 0));
  var R = j3(),
    a = c8(),
    e = jZ(),
    t = /^[0-9a-z_.-]+$/,
    r = /^[ -~]*$/;
  function h(p) {
    return t.test(p);
  }
  function i(p) {
    return r.test(p);
  }
  function c(p) {
    return p.endsWith("-bin");
  }
  function s(p) {
    return !p.startsWith("grpc-");
  }
  function A(p) {
    return p.toLowerCase();
  }
  function l(p, _) {
    if (!h(p))
      throw Error('Metadata key "' + p + '" contains illegal characters');
    if (_ !== null && _ !== void 0)
      if (c(p)) {
        if (!Buffer.isBuffer(_))
          throw Error("keys that end with '-bin' must have Buffer values");
      } else {
        if (Buffer.isBuffer(_))
          throw Error(
            "keys that don't end with '-bin' must have String values",
          );
        if (!i(_))
          throw Error(
            'Metadata string value "' + _ + '" contains illegal characters',
          );
      }
  }
  class o {
    constructor(p = {}) {
      ((this.internalRepr = new Map()), (this.options = p));
    }
    set(p, _) {
      ((p = A(p)), l(p, _), this.internalRepr.set(p, [_]));
    }
    add(p, _) {
      ((p = A(p)), l(p, _));
      let m = this.internalRepr.get(p);
      if (m === void 0) this.internalRepr.set(p, [_]);
      else m.push(_);
    }
    remove(p) {
      ((p = A(p)), this.internalRepr.delete(p));
    }
    get(p) {
      return ((p = A(p)), this.internalRepr.get(p) || []);
    }
    getMap() {
      let p = {};
      for (let [_, m] of this.internalRepr)
        if (m.length > 0) {
          let b = m[0];
          p[_] = Buffer.isBuffer(b) ? Buffer.from(b) : b;
        }
      return p;
    }
    clone() {
      let p = new o(this.options),
        _ = p.internalRepr;
      for (let [m, b] of this.internalRepr) {
        let y = b.map((u) => {
          if (Buffer.isBuffer(u)) return Buffer.from(u);
          else return u;
        });
        _.set(m, y);
      }
      return p;
    }
    merge(p) {
      for (let [_, m] of p.internalRepr) {
        let b = (this.internalRepr.get(_) || []).concat(m);
        this.internalRepr.set(_, b);
      }
    }
    setOptions(p) {
      this.options = p;
    }
    getOptions() {
      return this.options;
    }
    toHttp2Headers() {
      let p = {};
      for (let [_, m] of this.internalRepr) p[_] = m.map(n);
      return p;
    }
    toJSON() {
      let p = {};
      for (let [_, m] of this.internalRepr) p[_] = m;
      return p;
    }
    static fromHttp2Headers(p) {
      let _ = new o();
      for (let m of Object.keys(p)) {
        if (m.charAt(0) === ":") continue;
        let b = p[m];
        try {
          if (c(m)) {
            if (Array.isArray(b))
              b.forEach((y) => {
                _.add(m, Buffer.from(y, "base64"));
              });
            else if (b !== void 0)
              if (s(m))
                b.split(",").forEach((y) => {
                  _.add(m, Buffer.from(y.trim(), "base64"));
                });
              else _.add(m, Buffer.from(b, "base64"));
          } else if (Array.isArray(b))
            b.forEach((y) => {
              _.add(m, y);
            });
          else if (b !== void 0) _.add(m, b);
        } catch (y) {
          let u = `Failed to add metadata entry ${m}: ${b}. ${(0, e.getErrorMessage)(y)}. For more information see https://github.com/grpc/grpc-node/issues/1173`;
          (0, R.log)(a.LogVerbosity.ERROR, u);
        }
      }
      return _;
    }
  }
  T.Metadata = o;
  var n = (p) => {
    return Buffer.isBuffer(p) ? p.toString("base64") : p;
  };
};
