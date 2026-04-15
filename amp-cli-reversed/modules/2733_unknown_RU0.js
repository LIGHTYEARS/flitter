function RU0(T, R, a, e, t, r) {
  let h = a * 2,
    i = e * 4,
    c = t > 0 ? r / t : 0,
    s = R > 1 ? Math.round(T / (R - 1) * (h - 1)) : Math.floor(h / 2),
    A = Math.round((1 - c) * (i - 1)),
    l = R > 1 ? Math.round(T / (R - 1) * (a - 1)) : Math.floor(a / 2);
  return {
    dotX: s,
    dotY: A,
    cellX: l,
    cellY: Math.floor(A / 4)
  };
}