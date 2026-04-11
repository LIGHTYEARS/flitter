// Module: add-common-protos
// Original: ehR
// Type: CJS (RT wrapper)
// Exports: addCommonProtos, loadProtosWithOptions, loadProtosWithOptionsSync
// Category: util

// Module: ehR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.addCommonProtos =
      T.loadProtosWithOptionsSync =
      T.loadProtosWithOptions =
        void 0));
  var R = qT("fs"),
    a = qT("path"),
    e = BZ();
  function t(c, s) {
    let A = c.resolvePath;
    c.resolvePath = (l, o) => {
      if (a.isAbsolute(o)) return o;
      for (let n of s) {
        let p = a.join(n, o);
        try {
          return (R.accessSync(p, R.constants.R_OK), p);
        } catch (_) {
          continue;
        }
      }
      return (
        process.emitWarning(`${o} not found in any of the include paths ${s}`),
        A(l, o)
      );
    };
  }
  async function r(c, s) {
    let A = new e.Root();
    if (((s = s || {}), s.includeDirs)) {
      if (!Array.isArray(s.includeDirs))
        return Promise.reject(Error("The includeDirs option must be an array"));
      t(A, s.includeDirs);
    }
    let l = await A.load(c, s);
    return (l.resolveAll(), l);
  }
  T.loadProtosWithOptions = r;
  function h(c, s) {
    let A = new e.Root();
    if (((s = s || {}), s.includeDirs)) {
      if (!Array.isArray(s.includeDirs))
        throw Error("The includeDirs option must be an array");
      t(A, s.includeDirs);
    }
    let l = A.loadSync(c, s);
    return (l.resolveAll(), l);
  }
  T.loadProtosWithOptionsSync = h;
  function i() {
    let c = ThR(),
      s = fvT(),
      A = RhR(),
      l = ahR();
    (e.common("api", c.nested.google.nested.protobuf.nested),
      e.common("descriptor", s.nested.google.nested.protobuf.nested),
      e.common("source_context", A.nested.google.nested.protobuf.nested),
      e.common("type", l.nested.google.nested.protobuf.nested));
  }
  T.addCommonProtos = i;
};
