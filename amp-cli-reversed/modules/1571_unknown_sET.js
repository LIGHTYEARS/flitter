function sET(...T) {
  return new AR(R => {
    let a = 0,
      e = null;
    function t() {
      if (a >= T.length) {
        R.complete();
        return;
      }
      e = T[a].subscribe({
        next: r => R.next(r),
        error: r => R.error(r),
        complete: () => {
          a++, t();
        }
      });
    }
    return t(), () => {
      if (e) U3(e);
    };
  });
}