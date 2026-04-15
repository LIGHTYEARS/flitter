function w5R(T) {
  let R = {
    error: 0,
    warning: 1,
    info: 2,
    hint: 3
  };
  return [...T].sort((a, e) => {
    let t = R[a.severity] ?? 4,
      r = R[e.severity] ?? 4;
    return t - r;
  });
}