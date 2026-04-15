function LA0(T) {
  return new TextEncoder().encode(JSON.stringify(T)).length;
}
function yH(T, R, a) {
  if (T.length === 0) return [];
  let e = [],
    t = [];
  for (let r of T) {
    let h = [...t, r],
      i = LA0(a(h));
    if (t.length > 0 && i > R) {
      e.push(t), t = [r];
      continue;
    }
    t = h;
  }
  if (t.length > 0) e.push(t);
  return e;
}