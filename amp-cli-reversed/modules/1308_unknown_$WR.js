function $WR(T, R) {
  if (T.tool === ke || T.tool === Wt) {
    let a = T.input;
    return uWR(a, R);
  }
  if (T.tool === sk) {
    let a = T.input;
    if ("output" in T) {
      let e = xWR(T.output, R);
      if (e) return e;
    }
    return fWR(a, R);
  }
  if (T.tool === U8 || T.tool === Eb) {
    let a = z5T(T);
    if (!a) return null;
    let e = yWR(a.command);
    if (e.length > 0) {
      let t = e.map(r => WU(r, a.dir, R)).filter(r => r !== void 0);
      return gaT(t);
    }
  }
  return null;
}