function pxT(T) {
  try {
    let R = T.match(/^0\.0\.(\d+)(?:-g?([a-f0-9]+))?/);
    if (!R) return null;
    let a = parseInt(R[1], 10) * 1000,
      e = R[2],
      t = a !== 0 ? OO(a) : void 0;
    return {
      sha: e,
      age: t
    };
  } catch {
    return null;
  }
}