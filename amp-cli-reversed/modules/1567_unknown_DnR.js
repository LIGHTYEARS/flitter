function DnR(T) {
  return R => new AR(a => {
    let e = 0,
      t = R.subscribe({
        next(r) {
          if (e >= T) a.next(r);else e++;
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