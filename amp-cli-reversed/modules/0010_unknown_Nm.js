function Nm(T, R) {
  return {
    async fetchJSON(a, e) {
      let t = await T.getLatest(R),
        r = await DGR(a, {
          ...e,
          signal: R
        }, t);
      return {
        ok: r.ok,
        status: r.status ?? 0,
        data: r.data,
        statusText: r.statusText
      };
    }
  };
}