function r50(T) {
  let R = T.config.graphDirection,
    a = Array(100).fill(0),
    e = new Set(),
    t = [];
  for (let A of T.nodes) {
    if (!e.has(A.name)) t.push(A);
    e.add(A.name);
    for (let l of t2(T, A)) e.add(l.name);
  }
  let r = !1,
    h = !1;
  for (let A of t) if (a2(T, A)) {
    if (t2(T, A).length > 0) h = !0;
  } else r = !0;
  let i = R === "LR" && r && h,
    c,
    s = [];
  if (i) c = t.filter(A => !a2(T, A)), s = t.filter(A => a2(T, A));else c = t;
  for (let A of c) {
    let l = R === "LR" ? {
      x: 0,
      y: a[0]
    } : {
      x: a[0],
      y: 0
    };
    Wv(T, T.nodes[A.index], l), a[0] = a[0] + 4;
  }
  if (i && s.length > 0) for (let A of s) {
    let l = R === "LR" ? {
      x: 4,
      y: a[4]
    } : {
      x: a[4],
      y: 4
    };
    Wv(T, T.nodes[A.index], l), a[4] = a[4] + 4;
  }
  for (let A of T.nodes) {
    let l = A.gridCoord,
      o = R === "LR" ? l.x + 4 : l.y + 4,
      n = a[o];
    for (let p of t2(T, A)) {
      if (p.gridCoord !== null) continue;
      let _ = R === "LR" ? {
        x: o,
        y: n
      } : {
        x: n,
        y: o
      };
      Wv(T, T.nodes[p.index], _), a[o] = n + 4, n = a[o];
    }
  }
  for (let A of T.nodes) Jq0(T, A);
  for (let A of T.edges) Dq0(T, A), T50(T, A.path), wq0(T, A);
  for (let A of T.nodes) A.drawingCoord = vS(T, A.gridCoord), A.drawing = Nq0(A, T);
  gq0(T.canvas, T.columnWidth, T.rowHeight), e50(T), t50(T);
}