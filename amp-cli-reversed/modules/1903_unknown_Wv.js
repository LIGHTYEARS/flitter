function Zq0(T, R) {
  return R.map(a => vS(T, a));
}
function Wv(T, R, a) {
  if (T.grid.has(Wl(a))) if (T.config.graphDirection === "LR") return Wv(T, R, {
    x: a.x,
    y: a.y + 4
  });else return Wv(T, R, {
    x: a.x + 4,
    y: a.y
  });
  for (let e = 0; e < 3; e++) for (let t = 0; t < 3; t++) {
    let r = {
      x: a.x + e,
      y: a.y + t
    };
    T.grid.set(Wl(r), R);
  }
  return R.gridCoord = a, a;
}