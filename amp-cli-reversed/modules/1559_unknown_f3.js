function f3(T) {
  let R = T?.shouldCountRefs ?? !0,
    a = NnR++,
    e = (t, ...r) => {};
  return t => {
    let r = new W0(),
      h = null,
      i = !1,
      c,
      s = 0;
    return new AR(A => {
      if (s++, i) e("new subscriber, emitting buffered value", c), A.next(c);else e("new subscriber, no buffered value to emit");
      if (!h) h = t.subscribe({
        next: o => {
          i = !0, c = o, r.next(o);
        },
        error: o => r.error(o),
        complete: () => r.complete()
      });
      let l = r.subscribe(A);
      return () => {
        if (s--, l.unsubscribe(), R && s === 0) {
          if (h) U3(h), h = null;
          i = !1;
        }
      };
    });
  };
}