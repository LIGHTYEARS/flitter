function mE({
  onSubscribe: T,
  onUnsubscribe: R
}) {
  return a => new AR(e => {
    T?.();
    let t = a.subscribe(e);
    return () => {
      U3(t), R?.();
    };
  });
}
function I2(T) {
  return R => AR.from(R).pipe(L9(a => Q9(e => T(a, e))));
}
function vs(T) {
  return R => new AR(a => {
    let e,
      t = R.subscribe({
        next(r) {
          a.next(r);
        },
        error(r) {
          try {
            e = T(r).subscribe({
              next(h) {
                a.next(h);
              },
              error(h) {
                a.error(h);
              },
              complete() {
                a.complete();
              }
            });
          } catch (h) {
            a.error(h);
          }
        },
        complete() {
          a.complete();
        }
      });
    return () => {
      if (U3(t), e) U3(e);
    };
  });
}