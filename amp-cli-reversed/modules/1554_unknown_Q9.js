function gh(T) {
  return new AR(R => {
    T.then(a => {
      R.next(a), R.complete();
    }).catch(a => {
      R.error(a);
    });
  });
}
function Q9(T) {
  return new AR(R => {
    let a = !1,
      e = new AbortController(),
      t = e.signal;
    return (async () => {
      try {
        t?.throwIfAborted();
        let r = await T(t);
        if (t?.throwIfAborted(), !a) R.next(r), R.complete();
      } catch (r) {
        if (!a) if (t.aborted) R.complete();else R.error(r);
      }
    })(), () => {
      a = !0, e.abort();
    };
  });
}