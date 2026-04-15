function iHR(T, R = {
  fetch: () => JmT.get(),
  changes: JmT.events
}) {
  return {
    ...T,
    async get(a, e) {
      let t = await R.fetch();
      if (e === "admin" || !e && a in t) return t[a];
      return T.get(a, e);
    },
    async keys() {
      let a = await T.keys(),
        e = await R.fetch(),
        t = Object.keys(e),
        r = new Set([...a, ...t]);
      return Array.from(r);
    },
    get changes() {
      if (R.changes) return xj(T.changes, R.changes);
      return T.changes;
    }
  };
}