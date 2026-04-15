function hU0(T) {
  if (T.length === 0) return 1;
  let R = T[0]?.points.length ?? 0;
  if (R === 0) return 1;
  let a = 0;
  for (let e = 0; e < R; e++) {
    let t = 0;
    for (let r of T) t += r.points[e]?.value ?? 0;
    if (t > a) a = t;
  }
  return a || 1;
}