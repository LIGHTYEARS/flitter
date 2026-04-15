function D$(T) {
  return R => new AR(a => {
    let e = 0,
      t = !1,
      r = null,
      h = R.subscribe({
        next(i) {
          try {
            let c = T(i, e++);
            if (r) U3(r);
            r = c.subscribe({
              next(s) {
                a.next(s);
              },
              error(s) {
                a.error(s);
              },
              complete() {
                if (r = null, t && !r) a.complete();
              }
            });
          } catch (c) {
            a.error(c);
          }
        },
        error(i) {
          a.error(i);
        },
        complete() {
          if (t = !0, !r) a.complete();
        }
      });
    return () => {
      if (U3(h), r) U3(r);
    };
  });
}