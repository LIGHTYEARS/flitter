function da(T) {
  return R => {
    return new AR(a => {
      let e = R.subscribe({
        next(t) {
          if (T(t)) a.next(t);
        },
        error(t) {
          a.error(t);
        },
        complete() {
          a.complete();
        }
      });
      return () => U3(e);
    });
  };
}