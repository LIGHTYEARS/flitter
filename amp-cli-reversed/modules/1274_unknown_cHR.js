function cHR(T, R) {
  let a = T ?? {},
    e = R ?? {},
    t = JSON.stringify(a, Object.keys(a).sort()),
    r = JSON.stringify(e, Object.keys(e).sort());
  if (t === r) return [];
  let h = new Set([...Object.keys(a), ...Object.keys(e)]);
  return Array.from(h);
}