function fW(T) {
  let [R, a] = $S(T),
    e = [];
  for (let t = 0; t <= a; t++) {
    let r = "";
    for (let h = 0; h <= R; h++) r += T[h][t];
    e.push(r);
  }
  return e.join(`
`);
}
function fq0(T) {
  for (let R of T) R.reverse();
  for (let R of T) for (let a = 0; a < R.length; a++) {
    let e = xq0[R[a]];
    if (e) R[a] = e;
  }
  return T;
}
function Iq0(T, R, a) {
  rd(T, R.x + a.length, R.y);
  for (let e = 0; e < a.length; e++) T[R.x + e][R.y] = a[e];
}
function gq0(T, R, a) {
  let e = 0,
    t = 0;
  for (let r of R.values()) e += r;
  for (let r of a.values()) t += r;
  rd(T, e - 1, t - 1);
}
function $q0(T, R) {
  let a = new Map(),
    e = 0;
  for (let [i, c] of T.nodes) {
    let s = {
      name: i,
      displayLabel: c.label,
      index: e,
      gridCoord: null,
      drawingCoord: null,
      drawing: null,
      drawn: !1,
      styleClassName: "",
      styleClass: uq0
    };
    a.set(i, s), e++;
  }
  let t = [...a.values()],
    r = [];
  for (let i of T.edges) {
    let c = a.get(i.source),
      s = a.get(i.target);
    if (!c || !s) continue;
    r.push({
      from: c,
      to: s,
      text: i.label ?? "",
      path: [],
      labelLine: [],
      startDir: {
        x: 0,
        y: 0
      },
      endDir: {
        x: 0,
        y: 0
      }
    });
  }
  let h = [];
  for (let i of T.subgraphs) f9R(i, null, a, h);
  vq0(T.subgraphs, h, a);
  for (let [i, c] of T.classAssignments) {
    let s = a.get(i),
      A = T.classDefs.get(c);
    if (s && A) s.styleClassName = c, s.styleClass = {
      name: c,
      styles: A
    };
  }
  return {
    nodes: t,
    edges: r,
    canvas: Oh(0, 0),
    grid: new Map(),
    columnWidth: new Map(),
    rowHeight: new Map(),
    subgraphs: h,
    config: R,
    offsetX: 0,
    offsetY: 0
  };
}