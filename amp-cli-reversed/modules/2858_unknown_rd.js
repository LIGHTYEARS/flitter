function wgT(T, R, a) {
  if (!T.nodes.has(a.id)) T.nodes.set(a.id, a);
  k9R(R, a.id);
}
function k9R(T, R) {
  if (T.length > 0) {
    let a = T[T.length - 1];
    if (!a.nodeIds.includes(R)) a.nodeIds.push(R);
  }
}
function bq0(T) {
  if (T === "-.->") return "dotted";
  if (T === "-.-") return "dotted";
  if (T === "==>") return "thick";
  if (T === "===") return "thick";
  return "solid";
}
function BgT(T, R) {
  return T.x === R.x && T.y === R.y;
}
function mq0(T, R) {
  return T.x === R.x && T.y === R.y;
}
function rL(T, R) {
  return {
    x: T.x + R.x,
    y: T.y + R.y
  };
}
function Wl(T) {
  return `${T.x},${T.y}`;
}
function Oh(T, R) {
  let a = [];
  for (let e = 0; e <= T; e++) {
    let t = [];
    for (let r = 0; r <= R; r++) t.push(" ");
    a.push(t);
  }
  return a;
}
function lf(T) {
  let [R, a] = $S(T);
  return Oh(R, a);
}
function $S(T) {
  return [T.length - 1, (T[0]?.length ?? 1) - 1];
}
function rd(T, R, a) {
  let [e, t] = $S(T),
    r = Math.max(R, e),
    h = Math.max(a, t),
    i = Oh(r, h);
  for (let c = 0; c < i.length; c++) for (let s = 0; s < i[0].length; s++) if (c < T.length && s < T[0].length) i[c][s] = T[c][s];
  return T.length = 0, T.push(...i), T;
}