function E9(T = f2) {
  return R => {
    return new AR(a => {
      let e = g2,
        t = new FS(a),
        r = R.subscribe({
          complete() {
            t.complete();
          },
          error(h) {
            t.error(h);
          },
          next(h) {
            t.schedule(async i => {
              if (e === g2 || !T(e, h)) e = h, i(h);
            });
          }
        });
      return () => U3(r);
    });
  };
}