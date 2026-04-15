function Xq0(T, R) {
  let a = T.maxX - T.minX,
    e = T.maxY - T.minY;
  if (a <= 0 || e <= 0) return [Oh(0, 0), {
    x: 0,
    y: 0
  }];
  let t = Oh(a, e),
    r = 1,
    h = Math.floor(a / 2) - Math.floor(T.name.length / 2);
  if (h < 1) h = 1;
  for (let i = 0; i < T.name.length; i++) if (h + i < a) t[h + i][r] = T.name[i];
  return [t, {
    x: T.minX,
    y: T.minY
  }];
}