function L9(T) {
  return R => {
    return new AR(a => {
      let e = 0,
        t = null,
        r = !1,
        h = () => {
          if (r && !t) a.complete();
        },
        i = R.subscribe({
          next(c) {
            if (t) U3(t), t = null;
            let s;
            try {
              s = T(c, e++);
            } catch (A) {
              a.error(A);
              return;
            }
            t = s.subscribe({
              next(A) {
                a.next(A);
              },
              error(A) {
                a.error(A);
              },
              complete() {
                t = null, h();
              }
            });
          },
          error(c) {
            a.error(c);
          },
          complete() {
            r = !0, h();
          }
        });
      return () => {
        if (U3(i), t) U3(t);
      };
    });
  };
}