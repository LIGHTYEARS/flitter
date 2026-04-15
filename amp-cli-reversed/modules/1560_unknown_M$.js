function iET(T) {
  for (let R of T) if (R) U3(R);
}
function M$(T) {
  return R => {
    return new AR(a => {
      let e = R.subscribe({
          next: r => a.next(r),
          error: r => a.error(r),
          complete: () => a.complete()
        }),
        t = T.subscribe({
          next: () => {
            a.complete(), e.unsubscribe(), t.unsubscribe();
          },
          error: r => {
            a.error(r), e.unsubscribe();
          }
        });
      return () => {
        e.unsubscribe(), t.unsubscribe();
      };
    });
  };
}