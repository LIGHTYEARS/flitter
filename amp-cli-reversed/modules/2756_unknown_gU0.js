function IU0(T) {
  let R = 0;
  for (let a of T) for (let e of a.points) if (e.value > R) R = e.value;
  return R || 1;
}
function gU0(T, R, a, e, t) {
  if (a.length <= 1) {
    let i = e(T.value),
      c = T.meta ? ` (${T.meta})` : "";
    return T.label.length + 2 + i.length + c.length;
  }
  let r = T.label.length,
    h = 0;
  for (let i of a) {
    let c = i.points[R];
    if (!c) continue;
    h += c.value;
    let s = 2 + i.name.length + 2 + e(c.value).length;
    r = Math.max(r, s);
  }
  if (t) {
    let i = 9 + e(h).length;
    r = Math.max(r, i);
  }
  return r;
}