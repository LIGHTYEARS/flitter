function xj(...T) {
  return new AR(R => {
    let a = 0,
      e = T.map(t => t.subscribe({
        next: r => R.next(r),
        error: r => R.error(r),
        complete: () => {
          if (a++, a === T.length) R.complete();
        }
      }));
    return () => {
      iET(e);
    };
  });
}