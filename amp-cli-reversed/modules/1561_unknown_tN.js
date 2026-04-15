function tN(T) {
  return R => {
    return new AR(a => {
      let e,
        t = R.subscribe({
          next(r) {
            e = r, a.next(r);
          },
          error(r) {
            a.error(r);
          },
          complete() {
            a.complete();
          }
        });
      return () => {
        U3(t), T(e);
      };
    });
  };
}