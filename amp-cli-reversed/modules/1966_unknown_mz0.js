function mz0(T) {
  let R = new Date().getTime() - T.getTime(),
    a = Math.floor(R / 3600000),
    e = Math.floor(a / 24),
    t = Math.floor(e / 7),
    r = Math.floor(e / 30);
  if (a < 1) return "Just now";
  if (a < 24) return `${a}h ago`;
  if (e < 7) return `${e}d ago`;
  if (t <= 4) return `${t}w ago`;
  return `${r}mo ago`;
}