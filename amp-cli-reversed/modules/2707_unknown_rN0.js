function rN0(T) {
  let R = T ?? {},
    a = new Map(),
    e = new W0();
  if (T) {
    let t = Date.now();
    for (let r of Object.keys(T)) a.set(r, t);
  }
  return {
    async get(t) {
      return Promise.resolve(R[t]);
    },
    async set(t, r) {
      R[t] = r, a.set(t, Date.now()), e.next(t);
    },
    async delete(t) {
      delete R[t], a.delete(t), e.next(t);
    },
    async keys() {
      return Object.keys(R).toSorted((t, r) => (a.get(r) ?? 0) - (a.get(t) ?? 0));
    },
    async path(t) {
      return Promise.resolve(void 0);
    },
    changes: e.pipe(Y3(void 0))
  };
}