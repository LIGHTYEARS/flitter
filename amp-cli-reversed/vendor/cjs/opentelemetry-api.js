// Module: opentelemetry-api
// Original: ix
// Type: CJS (RT wrapper)
// Exports: getGlobal, registerGlobal, unregisterGlobal
// Category: npm-pkg

// Module: ix (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.unregisterGlobal = T.getGlobal = T.registerGlobal = void 0));
  var R = Z3R(),
    a = A$T(),
    e = J3R(),
    t = a.VERSION.split(".")[0],
    r = Symbol.for(`opentelemetry.js.api.${t}`),
    h = R._globalThis;
  function i(A, l, o, n = !1) {
    var p;
    let _ = (h[r] =
      (p = h[r]) !== null && p !== void 0 ? p : { version: a.VERSION });
    if (!n && _[A]) {
      let m = Error(
        `@opentelemetry/api: Attempted duplicate registration of API: ${A}`,
      );
      return (o.error(m.stack || m.message), !1);
    }
    if (_.version !== a.VERSION) {
      let m = Error(
        `@opentelemetry/api: Registration of version v${_.version} for ${A} does not match previously registered API v${a.VERSION}`,
      );
      return (o.error(m.stack || m.message), !1);
    }
    return (
      (_[A] = l),
      o.debug(
        `@opentelemetry/api: Registered a global for ${A} v${a.VERSION}.`,
      ),
      !0
    );
  }
  T.registerGlobal = i;
  function c(A) {
    var l, o;
    let n = (l = h[r]) === null || l === void 0 ? void 0 : l.version;
    if (!n || !(0, e.isCompatible)(n)) return;
    return (o = h[r]) === null || o === void 0 ? void 0 : o[A];
  }
  T.getGlobal = c;
  function s(A, l) {
    l.debug(
      `@opentelemetry/api: Unregistering a global for ${A} v${a.VERSION}.`,
    );
    let o = h[r];
    if (o) delete o[A];
  }
  T.unregisterGlobal = s;
};
