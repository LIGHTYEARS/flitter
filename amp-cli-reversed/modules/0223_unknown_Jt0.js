function Jt0(T, R = {}) {
  let a = new Zt0(T, R.encoding);
  return new Proxy(a, {
    get: (e, t, r) => {
      if (typeof t === "symbol" || t in e) {
        let h = Reflect.get(e, t, r);
        if (typeof h === "function") return h.bind(e);
        return h;
      }
      if (typeof t === "string") return {
        get: (h, i) => {
          return e.get(t, h, i);
        },
        getOrCreate: (h, i) => {
          return e.getOrCreate(t, h, i);
        },
        getForId: (h, i) => {
          return e.getForId(t, h, i);
        },
        create: async (h, i = {}) => {
          return await e.create(t, h, i);
        }
      };
      return;
    }
  });
}