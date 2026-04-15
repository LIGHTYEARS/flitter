function KS(T, R) {
  let a = R?.scheduler ?? aN;
  return e => new AR(t => {
    let r = null,
      h = null,
      i = !1,
      c = e.subscribe({
        next: s => {
          if (h = s, i = !0, r === null) r = a.schedule(() => {
            if (i) t.next(h), i = !1;
            r = null;
          }, T);
        },
        error: s => t.error(s),
        complete: () => {
          if (r !== null) r();
          if (i) t.next(h);
          t.complete();
        }
      });
    return () => {
      if (U3(c), r !== null) r();
    };
  });
}