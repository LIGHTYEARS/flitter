function ip0(T) {
  let R = 0,
    a = 0,
    e = 0,
    t = 0,
    r = 0,
    h = () => {
      if (t === 0 && r === 0) return;
      e += Math.min(t, r), t = 0, r = 0;
    };
  for (let i of T.split(`
`)) {
    if (i.startsWith("+") && !i.startsWith("+++")) {
      R += 1, t += 1;
      continue;
    }
    if (i.startsWith("-") && !i.startsWith("---")) {
      a += 1, r += 1;
      continue;
    }
    h();
  }
  return h(), {
    added: R,
    deleted: a,
    changed: e
  };
}