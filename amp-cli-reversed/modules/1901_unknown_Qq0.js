function Yq0(T) {
  function R(e) {
    return e.parent === null ? 0 : 1 + R(e.parent);
  }
  let a = [...T];
  return a.sort((e, t) => R(e) - R(t)), a;
}
function Qq0(T) {
  let R = T.config.useAscii,
    a = Yq0(T.subgraphs);
  for (let s of a) {
    let A = Vq0(s, T),
      l = {
        x: s.minX,
        y: s.minY
      };
    T.canvas = pl(T.canvas, l, R, A);
  }
  for (let s of T.nodes) if (!s.drawn && s.drawingCoord && s.drawing) T.canvas = pl(T.canvas, s.drawingCoord, R, s.drawing), s.drawn = !0;
  let e = [],
    t = [],
    r = [],
    h = [],
    i = [];
  for (let s of T.edges) {
    let [A, l, o, n, p] = Hq0(T, s);
    e.push(A), t.push(n), r.push(o), h.push(l), i.push(p);
  }
  let c = {
    x: 0,
    y: 0
  };
  T.canvas = pl(T.canvas, c, R, ...e), T.canvas = pl(T.canvas, c, R, ...t), T.canvas = pl(T.canvas, c, R, ...r), T.canvas = pl(T.canvas, c, R, ...h), T.canvas = pl(T.canvas, c, R, ...i);
  for (let s of T.subgraphs) {
    if (s.nodes.length === 0) continue;
    let [A, l] = Xq0(s);
    T.canvas = pl(T.canvas, l, R, A);
  }
  return T.canvas;
}