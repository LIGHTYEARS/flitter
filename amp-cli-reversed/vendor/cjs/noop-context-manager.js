// Module: noop-context-manager
// Original: haR
// Type: CJS (RT wrapper)
// Exports: NoopContextManager
// Category: util

// Module: haR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.NoopContextManager = void 0));
  var R = OB();
  class a {
    active() {
      return R.ROOT_CONTEXT;
    }
    with(e, t, r, ...h) {
      return t.call(r, ...h);
    }
    bind(e, t) {
      return t;
    }
    enable() {
      return this;
    }
    disable() {
      return this;
    }
  }
  T.NoopContextManager = a;
};
