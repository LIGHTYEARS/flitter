// Module: default-text-map-getter
// Original: b$T
// Type: CJS (RT wrapper)
// Exports: defaultTextMapGetter, defaultTextMapSetter
// Category: util

// Module: b$T (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.defaultTextMapSetter = T.defaultTextMapGetter = void 0),
    (T.defaultTextMapGetter = {
      get(R, a) {
        if (R == null) return;
        return R[a];
      },
      keys(R) {
        if (R == null) return [];
        return Object.keys(R);
      },
    }),
    (T.defaultTextMapSetter = {
      set(R, a, e) {
        if (R == null) return;
        R[a] = e;
      },
    }));
};
