function BnR(T, R) {
  return a => {
    return new AR(e => {
      let t,
        r = 0,
        h = new FS(e),
        i = a.subscribe({
          complete() {
            h.complete();
          },
          error(c) {
            h.error(c);
          },
          next(c) {
            h.schedule(async s => {
              t = await T(r === 0 ? typeof R > "u" ? c : R : t, c, r++), s(t);
            });
          }
        });
      return () => U3(i);
    });
  };
}