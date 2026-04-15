function KI(T) {
  let R = new Map();
  return new Proxy(T, {
    get(a, e, t) {
      if (typeof e === "symbol") return Reflect.get(a, e, t);
      if (e === "constructor" || e in a) {
        let r = Reflect.get(a, e, a);
        if (typeof r === "function") return r.bind(a);
        return r;
      }
      if (typeof e === "string") {
        if (e === "then") return;
        let r = R.get(e);
        if (!r) r = (...h) => a.action({
          name: e,
          args: h
        }), R.set(e, r);
        return r;
      }
    },
    has(a, e) {
      if (typeof e === "string") return !0;
      return Reflect.has(a, e);
    },
    getPrototypeOf(a) {
      return Reflect.getPrototypeOf(a);
    },
    ownKeys(a) {
      return Reflect.ownKeys(a);
    },
    getOwnPropertyDescriptor(a, e) {
      let t = Reflect.getOwnPropertyDescriptor(a, e);
      if (t) return t;
      if (typeof e === "string") return {
        configurable: !0,
        enumerable: !1,
        writable: !1,
        value: (...r) => a.action({
          name: e,
          args: r
        })
      };
      return;
    }
  });
}