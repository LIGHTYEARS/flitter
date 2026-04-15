function GVT(T, R) {
  let a = h => {
      let [i, c] = h.split("-");
      return {
        parts: i?.split(".").map(Number) || [],
        label: c
      };
    },
    e = a(T),
    t = a(R),
    r = Math.max(e.parts.length, t.parts.length);
  for (let h = 0; h < r; h++) {
    let i = e.parts[h] || 0,
      c = t.parts[h] || 0;
    if (i < c) return -1;
    if (i > c) return 1;
  }
  if (e.label === t.label) return 0;
  if (!e.label && t.label) return 1;
  if (e.label && !t.label) return -1;
  if (e.label && t.label) return e.label < t.label ? -1 : 1;
  return 0;
}