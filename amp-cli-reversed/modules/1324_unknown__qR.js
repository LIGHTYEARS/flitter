function _qR(T, R) {
  if (R) {
    let t = u3(T, R),
      r = u3(T, "skills", R),
      h = u3(T, ".agents", "skills", R);
    for (let i of [t, r, h]) {
      let c = uuT(i);
      if (c.length > 0) return c;
    }
    return [];
  }
  let a = [T, u3(T, "skills"), u3(T, ".agents", "skills"), u3(T, ".claude", "skills")],
    e = [];
  for (let t of a) e.push(...uuT(t));
  return [...new Set(e)];
}