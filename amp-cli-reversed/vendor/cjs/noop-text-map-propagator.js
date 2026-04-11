// Module: noop-text-map-propagator
// Original: yaR
// Type: CJS (RT wrapper)
// Exports: NoopTextMapPropagator
// Category: util

// Module: yaR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.NoopTextMapPropagator = void 0));
  class R {
    inject(a, e) {}
    extract(a, e) {
      return a;
    }
    fields() {
      return [];
    }
  }
  T.NoopTextMapPropagator = R;
};
