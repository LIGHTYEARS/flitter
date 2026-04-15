function Gl(T) {
  return R => {
    return new AR(a => {
      let e = !1,
        t = R.subscribe({
          next: h => {
            e = !0, clearTimeout(r), a.next(h);
          },
          error: h => {
            clearTimeout(r), a.error(h);
          },
          complete: () => {
            clearTimeout(r), a.complete();
          }
        }),
        r = setTimeout(() => {
          if (!e) t.unsubscribe(), a.error(new x0T(`Operation timed out after ${T}ms`));
        }, T);
      return () => {
        clearTimeout(r), t.unsubscribe();
      };
    });
  };
}