function h3R(T) {
  let R = new Date().getTime() - T.getTime(),
    a = Math.floor(R / 1000),
    e = Math.floor(a / 60),
    t = Math.floor(e / 60),
    r = Math.floor(t / 24),
    h = Math.floor(r / 7),
    i = Math.floor(r / 30),
    c = Math.floor(r / 365);
  if (a < 60) return a <= 1 ? "now" : `${a}s ago`;else if (e < 60) return `${e}m ago`;else if (t < 24) return `${t}h ago`;else if (r < 7) return `${r}d ago`;else if (h < 4) return `${h}w ago`;else if (i < 12) return `${i}mo ago`;else return `${c}y ago`;
}