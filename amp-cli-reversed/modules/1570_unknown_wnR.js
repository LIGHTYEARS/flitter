function wnR(T, R) {
  if (!R.leading || !R.trailing) throw Error("leading and trailing must be true");
  let a = R.scheduler ?? aN;
  return e => new AR(t => {
    let r = 0,
      h = null,
      i = null,
      c = !1,
      s = e.subscribe({
        next: A => {
          let l = a.now();
          if (i = A, c = !0, l - r >= T) t.next(A), r = l, c = !1;else if (h === null) h = a.schedule(() => {
            if (c) t.next(i), r = a.now(), c = !1;
            h = null;
          }, T - (l - r));
          if (r === 0) t.next(A), r = l, c = !1;
        },
        error: A => t.error(A),
        complete: () => {
          if (h !== null) h();
          if (c) t.next(i);
          t.complete();
        }
      });
    return () => {
      if (U3(s), h !== null) h();
    };
  });
}