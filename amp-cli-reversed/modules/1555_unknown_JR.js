function JR(T) {
  return R => {
    return new AR(a => {
      let e = new FS(a),
        t = 0,
        r = R.subscribe({
          complete() {
            e.complete();
          },
          error(h) {
            e.error(h);
          },
          next(h) {
            e.schedule(async i => {
              let c = await T(h, t);
              t++, i(c);
            });
          }
        });
      return () => U3(r);
    });
  };
}