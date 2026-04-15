function D4R(T) {
  let R = Math.floor(T / 1000),
    a = Math.floor(R / 3600),
    e = Math.floor(R % 3600 / 60),
    t = R % 60;
  if (a > 0) return `${a}h ${e}m`;else if (e > 0) return `${e}m ${t}s`;
  return `${t}s`;
}