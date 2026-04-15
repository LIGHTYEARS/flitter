function pbR(T, R) {
  return new AR(a => {
    let e = setTimeout(t, R);
    function t() {
      a.error(Error(`Tool execution timed out after ${R / 1000} seconds`));
    }
    function r() {
      if (e) clearTimeout(e);
      e = setTimeout(t, R);
    }
    let h = T.subscribe({
      next: i => {
        r(), a.next(i);
      },
      error: i => {
        if (e) clearTimeout(e), e = null;
        a.error(i);
      },
      complete: () => {
        if (e) clearTimeout(e), e = null;
        a.complete();
      }
    });
    return () => {
      if (e) clearTimeout(e), e = null;
      h.unsubscribe();
    };
  });
}