// Module: instrumentation-base-4
// Original: zaR
// Type: CJS (RT wrapper)
// Exports: InstrumentationBase
// Category: util

// Module: zaR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.InstrumentationBase = void 0));
  var R = qT("path"),
    a = qT("util"),
    e = DaR(),
    t = g$T(),
    r = waR(),
    h = HaR(),
    i = qaR(),
    c = n0(),
    s = j$T(),
    A = qT("fs"),
    l = S$T();
  class o extends r.InstrumentationAbstract {
    _modules;
    _hooks = [];
    _requireInTheMiddleSingleton = h.RequireInTheMiddleSingleton.getInstance();
    _enabled = !1;
    constructor(p, _, m) {
      super(p, _, m);
      let b = this.init();
      if (b && !Array.isArray(b)) b = [b];
      if (((this._modules = b || []), this._config.enabled)) this.enable();
    }
    _wrap = (p, _, m) => {
      if ((0, l.isWrapped)(p[_])) this._unwrap(p, _);
      if (!a.types.isProxy(p)) return (0, t.wrap)(p, _, m);
      else {
        let b = (0, t.wrap)(Object.assign({}, p), _, m);
        return (Object.defineProperty(p, _, { value: b }), b);
      }
    };
    _unwrap = (p, _) => {
      if (!a.types.isProxy(p)) return (0, t.unwrap)(p, _);
      else return Object.defineProperty(p, _, { value: p[_] });
    };
    _massWrap = (p, _, m) => {
      if (!p) {
        c.diag.error("must provide one or more modules to patch");
        return;
      } else if (!Array.isArray(p)) p = [p];
      if (!(_ && Array.isArray(_))) {
        c.diag.error("must provide one or more functions to wrap on modules");
        return;
      }
      p.forEach((b) => {
        _.forEach((y) => {
          this._wrap(b, y, m);
        });
      });
    };
    _massUnwrap = (p, _) => {
      if (!p) {
        c.diag.error("must provide one or more modules to patch");
        return;
      } else if (!Array.isArray(p)) p = [p];
      if (!(_ && Array.isArray(_))) {
        c.diag.error("must provide one or more functions to wrap on modules");
        return;
      }
      p.forEach((m) => {
        _.forEach((b) => {
          this._unwrap(m, b);
        });
      });
    };
    _warnOnPreloadedModules() {
      this._modules.forEach((p) => {
        let { name: _ } = p;
        try {
          let m = qT.resolve(_);
          if (qT.cache[m])
            this._diag.warn(
              `Module ${_} has been loaded before ${this.instrumentationName} so it might not work, please initialize it before requiring ${_}`,
            );
        } catch {}
      });
    }
    _extractPackageVersion(p) {
      try {
        let _ = (0, A.readFileSync)(R.join(p, "package.json"), {
            encoding: "utf8",
          }),
          m = JSON.parse(_).version;
        return typeof m === "string" ? m : void 0;
      } catch {
        c.diag.warn("Failed extracting version", p);
      }
      return;
    }
    _onRequire(p, _, m, b) {
      if (!b) {
        if (typeof p.patch === "function") {
          if (((p.moduleExports = _), this._enabled))
            return (
              this._diag.debug(
                "Applying instrumentation patch for nodejs core module on require hook",
                { module: p.name },
              ),
              p.patch(_)
            );
        }
        return _;
      }
      let y = this._extractPackageVersion(b);
      if (((p.moduleVersion = y), p.name === m)) {
        if (n(p.supportedVersions, y, p.includePrerelease)) {
          if (typeof p.patch === "function") {
            if (((p.moduleExports = _), this._enabled))
              return (
                this._diag.debug(
                  "Applying instrumentation patch for module on require hook",
                  { module: p.name, version: p.moduleVersion, baseDir: b },
                ),
                p.patch(_, p.moduleVersion)
              );
          }
        }
        return _;
      }
      let u = p.files ?? [],
        P = R.normalize(m);
      return u
        .filter((k) => k.name === P)
        .filter((k) => n(k.supportedVersions, y, p.includePrerelease))
        .reduce((k, x) => {
          if (((x.moduleExports = k), this._enabled))
            return (
              this._diag.debug(
                "Applying instrumentation patch for nodejs module file on require hook",
                {
                  module: p.name,
                  version: p.moduleVersion,
                  fileName: x.name,
                  baseDir: b,
                },
              ),
              x.patch(k, p.moduleVersion)
            );
          return k;
        }, _);
    }
    enable() {
      if (this._enabled) return;
      if (((this._enabled = !0), this._hooks.length > 0)) {
        for (let p of this._modules) {
          if (typeof p.patch === "function" && p.moduleExports)
            (this._diag.debug(
              "Applying instrumentation patch for nodejs module on instrumentation enabled",
              { module: p.name, version: p.moduleVersion },
            ),
              p.patch(p.moduleExports, p.moduleVersion));
          for (let _ of p.files)
            if (_.moduleExports)
              (this._diag.debug(
                "Applying instrumentation patch for nodejs module file on instrumentation enabled",
                { module: p.name, version: p.moduleVersion, fileName: _.name },
              ),
                _.patch(_.moduleExports, p.moduleVersion));
        }
        return;
      }
      this._warnOnPreloadedModules();
      for (let p of this._modules) {
        let _ = (u, P, k) => {
            if (!k && R.isAbsolute(P)) {
              let x = R.parse(P);
              ((P = x.name), (k = x.dir));
            }
            return this._onRequire(p, u, P, k);
          },
          m = (u, P, k) => {
            return this._onRequire(p, u, P, k);
          },
          b = R.isAbsolute(p.name)
            ? new s.Hook([p.name], { internals: !0 }, m)
            : this._requireInTheMiddleSingleton.register(p.name, m);
        this._hooks.push(b);
        let y = new i.Hook([p.name], { internals: !1 }, _);
        this._hooks.push(y);
      }
    }
    disable() {
      if (!this._enabled) return;
      this._enabled = !1;
      for (let p of this._modules) {
        if (typeof p.unpatch === "function" && p.moduleExports)
          (this._diag.debug(
            "Removing instrumentation patch for nodejs module on instrumentation disabled",
            { module: p.name, version: p.moduleVersion },
          ),
            p.unpatch(p.moduleExports, p.moduleVersion));
        for (let _ of p.files)
          if (_.moduleExports)
            (this._diag.debug(
              "Removing instrumentation patch for nodejs module file on instrumentation disabled",
              { module: p.name, version: p.moduleVersion, fileName: _.name },
            ),
              _.unpatch(_.moduleExports, p.moduleVersion));
      }
    }
    isEnabled() {
      return this._enabled;
    }
  }
  T.InstrumentationBase = o;
  function n(p, _, m) {
    if (typeof _ > "u") return p.includes("*");
    return p.some((b) => {
      return (0, e.satisfies)(_, b, { includePrerelease: m });
    });
  }
};
