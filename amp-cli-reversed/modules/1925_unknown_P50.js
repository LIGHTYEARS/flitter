function P50(T, R) {
  let a = T.split(`
`).map(f => f.trim()).filter(f => f.length > 0 && !f.startsWith("%%")),
    e = _50(a);
  if (e.entities.length === 0) return "";
  let t = R.useAscii,
    r = 6,
    h = 4,
    i = new Map(),
    c = new Map(),
    s = new Map();
  for (let f of e.entities) {
    let v = y50(f);
    i.set(f.id, v);
    let g = 0;
    for (let j of v) for (let d of j) g = Math.max(g, d.length);
    let I = g + 4,
      S = 0;
    for (let j of v) S += Math.max(j.length, 1);
    let O = S + (v.length - 1) + 2;
    c.set(f.id, I), s.set(f.id, O);
  }
  let A = Math.max(2, Math.ceil(Math.sqrt(e.entities.length))),
    l = new Map(),
    o = 0,
    n = 0,
    p = 0,
    _ = 0;
  for (let f of e.entities) {
    let v = c.get(f.id),
      g = s.get(f.id);
    if (_ >= A) n += p + h, o = 0, p = 0, _ = 0;
    l.set(f.id, {
      entity: f,
      sections: i.get(f.id),
      x: o,
      y: n,
      width: v,
      height: g
    }), o += v + r, p = Math.max(p, g), _++;
  }
  let m = 0,
    b = 0;
  for (let f of l.values()) m = Math.max(m, f.x + f.width), b = Math.max(b, f.y + f.height);
  m += 4, b += 2;
  let y = Oh(m - 1, b - 1);
  for (let f of l.values()) {
    let v = I9R(f.sections, t);
    for (let g = 0; g < v.length; g++) for (let I = 0; I < v[0].length; I++) {
      let S = v[g][I];
      if (S !== " ") {
        let O = f.x + g,
          j = f.y + I;
        if (O < m && j < b) y[O][j] = S;
      }
    }
  }
  let u = t ? "-" : "\u2500",
    P = t ? "|" : "\u2502",
    k = t ? "." : "\u254C",
    x = t ? ":" : "\u250A";
  for (let f of e.relationships) {
    let v = l.get(f.entity1),
      g = l.get(f.entity2);
    if (!v || !g) continue;
    let I = f.identifying ? u : k,
      S = f.identifying ? P : x,
      O = v.x + Math.floor(v.width / 2),
      j = v.y + Math.floor(v.height / 2),
      d = g.x + Math.floor(g.width / 2),
      C = g.y + Math.floor(g.height / 2);
    if (Math.abs(j - C) < Math.max(v.height, g.height)) {
      let [L, w] = O < d ? [v, g] : [g, v],
        [D, B] = O < d ? [f.cardinality1, f.cardinality2] : [f.cardinality2, f.cardinality1],
        M = L.x + L.width,
        V = w.x - 1,
        Q = L.y + Math.floor(L.height / 2);
      for (let iT = M; iT <= V; iT++) if (iT < m) y[iT][Q] = I;
      let W = iL(D, t);
      for (let iT = 0; iT < W.length; iT++) {
        let aT = M + iT;
        if (aT < m) y[aT][Q] = W[iT];
      }
      let eT = iL(B, t);
      for (let iT = 0; iT < eT.length; iT++) {
        let aT = V - eT.length + 1 + iT;
        if (aT >= 0 && aT < m) y[aT][Q] = eT[iT];
      }
      if (f.label) {
        let iT = Math.floor((M + V) / 2),
          aT = Math.max(M, iT - Math.floor(f.label.length / 2)),
          oT = Q - 1;
        if (oT >= 0) for (let TT = 0; TT < f.label.length; TT++) {
          let tT = aT + TT;
          if (tT >= M && tT <= V && tT < m) y[tT][oT] = f.label[TT];
        }
      }
    } else {
      let [L, w] = j < C ? [v, g] : [g, v],
        [D, B] = j < C ? [f.cardinality1, f.cardinality2] : [f.cardinality2, f.cardinality1],
        M = L.y + L.height,
        V = w.y - 1,
        Q = L.x + Math.floor(L.width / 2);
      for (let oT = M; oT <= V; oT++) if (oT < b) y[Q][oT] = S;
      let W = w.x + Math.floor(w.width / 2);
      if (Q !== W) {
        let oT = Math.floor((M + V) / 2),
          TT = Math.min(Q, W),
          tT = Math.max(Q, W);
        for (let lT = TT; lT <= tT; lT++) if (lT < m && oT < b) y[lT][oT] = I;
        for (let lT = oT + 1; lT <= V; lT++) if (lT < b) y[W][lT] = S;
      }
      let eT = iL(D, t);
      if (M < b) for (let oT = 0; oT < eT.length; oT++) {
        let TT = Q - Math.floor(eT.length / 2) + oT;
        if (TT >= 0 && TT < m) y[TT][M] = eT[oT];
      }
      let iT = Q !== W ? W : Q,
        aT = iL(B, t);
      if (V >= 0 && V < b) for (let oT = 0; oT < aT.length; oT++) {
        let TT = iT - Math.floor(aT.length / 2) + oT;
        if (TT >= 0 && TT < m) y[TT][V] = aT[oT];
      }
      if (f.label) {
        let oT = Math.floor((M + V) / 2),
          TT = Q + 2;
        if (oT >= 0) for (let tT = 0; tT < f.label.length; tT++) {
          let lT = TT + tT;
          if (lT >= 0) rd(y, lT + 1, oT + 1), y[lT][oT] = f.label[tT];
        }
      }
    }
  }
  return fW(y);
}