function hET(T, R = aN) {
  return new AR(a => {
    let e = 0,
      t = null,
      r = () => {
        a.next(e++), t = R.schedule(r, T);
      };
    return t = R.schedule(r, T), () => {
      if (t) t();
    };
  });
}