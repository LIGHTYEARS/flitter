function Y3(T) {
  return R => new AR(a => {
    let e;
    try {
      a.next(T), e = R.subscribe({
        next(t) {
          a.next(t);
        },
        error(t) {
          a.error(t);
        },
        complete() {
          a.complete();
        }
      });
    } catch (t) {
      a.error(t);
    }
    return () => {
      if (e) U3(e);
    };
  });
}