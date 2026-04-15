function ti(T) {
  return R => new AR(a => {
    let e = 0,
      t = R.subscribe({
        next(r) {
          if (e < T) {
            if (a.next(r), e++, e === T) a.complete(), U3(t);
          }
        },
        error(r) {
          a.error(r);
        },
        complete() {
          a.complete();
        }
      });
    return () => {
      U3(t);
    };
  });
}