function jiR(T) {
  let R;
  return new Proxy({}, {
    get(a, e, t) {
      return R ?? (R = T()), Reflect.get(R, e, t);
    },
    set(a, e, t, r) {
      return R ?? (R = T()), Reflect.set(R, e, t, r);
    },
    has(a, e) {
      return R ?? (R = T()), Reflect.has(R, e);
    },
    deleteProperty(a, e) {
      return R ?? (R = T()), Reflect.deleteProperty(R, e);
    },
    ownKeys(a) {
      return R ?? (R = T()), Reflect.ownKeys(R);
    },
    getOwnPropertyDescriptor(a, e) {
      return R ?? (R = T()), Reflect.getOwnPropertyDescriptor(R, e);
    },
    defineProperty(a, e, t) {
      return R ?? (R = T()), Reflect.defineProperty(R, e, t);
    }
  });
}