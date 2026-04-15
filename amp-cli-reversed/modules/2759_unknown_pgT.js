function pgT(T) {
  let R = new Date().getTime() - T.getTime(),
    a = Math.floor(R / 60000),
    e = Math.floor(R / 3600000),
    t = Math.floor(R / 86400000);
  if (a < 1) return "just now";
  if (a < 60) return `${a}m ago`;
  if (e < 24) return `${e}h ago`;
  if (t < 7) return `${t}d ago`;
  return T.toLocaleDateString();
}