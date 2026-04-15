function N7R(T) {
  let {
      interval: R,
      fn: a,
      cacheKey: e
    } = T,
    t = new Map(),
    r = new Map();
  return (...h) => {
    let i = e ? e(...h) : "default",
      c = Date.now(),
      s = r.get(i) || 0;
    if (t.has(i) && c - s < R) return t.get(i);
    r.set(i, c);
    let A = a(...h);
    return t.set(i, A), A;
  };
}