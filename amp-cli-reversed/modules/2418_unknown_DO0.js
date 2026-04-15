function DO0(T, R, a, e) {
  let t = 0;
  if (a === 0 && e.length === 0) return;
  while (t < T.map.length) {
    if (T.map[t][0] === R) {
      T.map[t][1] += a, T.map[t][2].push(...e);
      return;
    }
    t += 1;
  }
  T.map.push([R, a, e]);
}