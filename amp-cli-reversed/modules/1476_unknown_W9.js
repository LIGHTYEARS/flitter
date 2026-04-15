function W9(T, R, a) {
  let e = void 0;
  Object.defineProperty(T, R, {
    get() {
      if (e === n2) return;
      if (e === void 0) e = n2, e = a();
      return e;
    },
    set(t) {
      Object.defineProperty(T, R, {
        value: t
      });
    },
    configurable: !0
  });
}