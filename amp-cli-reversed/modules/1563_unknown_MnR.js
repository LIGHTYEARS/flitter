function cET(T) {
  return MnR(typeof T === "function" ? {
    next: T
  } : T);
}
function MnR(T) {
  return R => new AR(a => {
    let e = typeof T === "function" ? T() : T,
      t = R.subscribe({
        next(r) {
          if (e.next) try {
            e.next(r);
          } catch (h) {
            a.error(h);
            return;
          }
          a.next(r);
        },
        error(r) {
          if (e.error) try {
            e.error(r);
          } catch (h) {
            a.error(h);
            return;
          }
          a.error(r);
        },
        complete() {
          if (e.complete) try {
            e.complete();
          } catch (r) {
            a.error(r);
            return;
          }
          a.complete();
        }
      });
    return () => U3(t);
  });
}