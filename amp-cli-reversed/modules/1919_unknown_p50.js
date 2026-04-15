function p50(T, R) {
  let a = T.split(`
`).map(O => O.trim()).filter(O => O.length > 0 && !O.startsWith("%%")),
    e = s50(a);
  if (e.classes.length === 0) return "";
  let t = R.useAscii,
    r = 4,
    h = 3,
    i = new Map(),
    c = new Map(),
    s = new Map();
  for (let O of e.classes) {
    let j = l50(O);
    i.set(O.id, j);
    let d = 0;
    for (let D of j) for (let B of D) d = Math.max(d, B.length);
    let C = d + 4,
      L = 0;
    for (let D of j) L += Math.max(D.length, 1);
    let w = L + (j.length - 1) + 2;
    c.set(O.id, C), s.set(O.id, w);
  }
  let A = new Map();
  for (let O of e.classes) A.set(O.id, O);
  let l = new Map(),
    o = new Map();
  for (let O of e.relationships) {
    let j = O.type === "inheritance" || O.type === "realization",
      d = j && O.markerAt === "to" ? O.to : O.from,
      C = j && O.markerAt === "to" ? O.from : O.to;
    if (!l.has(C)) l.set(C, new Set());
    if (l.get(C).add(d), !o.has(d)) o.set(d, new Set());
    o.get(d).add(C);
  }
  let n = new Map(),
    p = e.classes.filter(O => !l.has(O.id) || l.get(O.id).size === 0).map(O => O.id);
  for (let O of p) n.set(O, 0);
  let _ = e.classes.length - 1,
    m = 0;
  while (m < p.length) {
    let O = p[m++],
      j = o.get(O);
    if (!j) continue;
    for (let d of j) {
      let C = (n.get(O) ?? 0) + 1;
      if (C > _) continue;
      if (!n.has(d) || n.get(d) < C) n.set(d, C), p.push(d);
    }
  }
  for (let O of e.classes) if (!n.has(O.id)) n.set(O.id, 0);
  let b = Math.max(...[...n.values()], 0),
    y = Array.from({
      length: b + 1
    }, () => []);
  for (let O of e.classes) y[n.get(O.id)].push(O.id);
  let u = new Map(),
    P = 0;
  for (let O = 0; O <= b; O++) {
    let j = y[O];
    if (j.length === 0) continue;
    let d = 0,
      C = 0;
    for (let L of j) {
      let w = A.get(L),
        D = c.get(L),
        B = s.get(L);
      u.set(L, {
        cls: w,
        sections: i.get(L),
        x: d,
        y: P,
        width: D,
        height: B
      }), d += D + r, C = Math.max(C, B);
    }
    P += C + h;
  }
  let k = 0,
    x = 0;
  for (let O of u.values()) k = Math.max(k, O.x + O.width), x = Math.max(x, O.y + O.height);
  k += 4, x += 2;
  let f = Oh(k - 1, x - 1);
  for (let O of u.values()) {
    let j = I9R(O.sections, t);
    for (let d = 0; d < j.length; d++) for (let C = 0; C < j[0].length; C++) {
      let L = j[d][C];
      if (L !== " ") {
        let w = O.x + d,
          D = O.y + C;
        if (w < k && D < x) f[w][D] = L;
      }
    }
  }
  let v = t ? "-" : "\u2500",
    g = t ? "|" : "\u2502",
    I = t ? "." : "\u254C",
    S = t ? ":" : "\u250A";
  for (let O of e.relationships) {
    let j = u.get(O.from),
      d = u.get(O.to);
    if (!j || !d) continue;
    let C = A50(O.type, O.markerAt),
      L = C.dashed ? I : v,
      w = C.dashed ? S : g,
      D = j.x + Math.floor(j.width / 2),
      B = j.y + j.height - 1,
      M = d.x + Math.floor(d.width / 2),
      V = d.y;
    if (B < V) {
      let Q = B + Math.floor((V - B) / 2);
      for (let W = B + 1; W <= Q; W++) if (W < x) f[D][W] = w;
      if (D !== M) {
        let W = Math.min(D, M),
          eT = Math.max(D, M);
        for (let iT = W; iT <= eT; iT++) if (iT < k && Q < x) f[iT][Q] = L;
        if (!t && Q < x) if (D < M) f[D][Q] = "\u2514", f[M][Q] = "\u2510";else f[D][Q] = "\u2518", f[M][Q] = "\u250C";
      }
      for (let W = Q + 1; W < V; W++) if (W < x) f[M][W] = w;
      if (C.markerAt === "to") {
        let W = my(C.type, t, "down"),
          eT = V - 1;
        if (eT >= 0 && eT < x) for (let iT = 0; iT < W.length; iT++) {
          let aT = M - Math.floor(W.length / 2) + iT;
          if (aT >= 0 && aT < k) f[aT][eT] = W[iT];
        }
      }
      if (C.markerAt === "from") {
        let W = my(C.type, t, "down"),
          eT = B + 1;
        if (eT < x) for (let iT = 0; iT < W.length; iT++) {
          let aT = D - Math.floor(W.length / 2) + iT;
          if (aT >= 0 && aT < k) f[aT][eT] = W[iT];
        }
      }
    } else if (d.y + d.height - 1 < j.y) {
      let Q = j.y,
        W = d.y + d.height - 1,
        eT = W + Math.floor((Q - W) / 2);
      for (let iT = Q - 1; iT >= eT; iT--) if (iT >= 0 && iT < x) f[D][iT] = w;
      if (D !== M) {
        let iT = Math.min(D, M),
          aT = Math.max(D, M);
        for (let oT = iT; oT <= aT; oT++) if (oT < k && eT >= 0 && eT < x) f[oT][eT] = L;
        if (!t && eT >= 0 && eT < x) if (D < M) f[D][eT] = "\u250C", f[M][eT] = "\u2518";else f[D][eT] = "\u2510", f[M][eT] = "\u2514";
      }
      for (let iT = eT - 1; iT > W; iT--) if (iT >= 0 && iT < x) f[M][iT] = w;
      if (C.markerAt === "from") {
        let iT = my(C.type, t, "up"),
          aT = Q - 1;
        if (aT >= 0 && aT < x) for (let oT = 0; oT < iT.length; oT++) {
          let TT = D - Math.floor(iT.length / 2) + oT;
          if (TT >= 0 && TT < k) f[TT][aT] = iT[oT];
        }
      }
      if (C.markerAt === "to") {
        let iT = C.type === "inheritance" || C.type === "realization" ? "down" : "up",
          aT = my(C.type, t, iT),
          oT = W + 1;
        if (oT < x) for (let TT = 0; TT < aT.length; TT++) {
          let tT = M - Math.floor(aT.length / 2) + TT;
          if (tT >= 0 && tT < k) f[tT][oT] = aT[TT];
        }
      }
    } else {
      let Q = Math.max(B, d.y + d.height - 1) + 2;
      rd(f, k, Q + 1);
      for (let iT = B + 1; iT <= Q; iT++) f[D][iT] = w;
      let W = Math.min(D, M),
        eT = Math.max(D, M);
      for (let iT = W; iT <= eT; iT++) f[iT][Q] = L;
      for (let iT = Q - 1; iT >= d.y + d.height; iT--) f[M][iT] = w;
      if (C.markerAt === "from") {
        let iT = my(C.type, t, "down"),
          aT = B + 1;
        if (aT < x) for (let oT = 0; oT < iT.length; oT++) {
          let TT = D - Math.floor(iT.length / 2) + oT;
          if (TT >= 0 && TT < k) f[TT][aT] = iT[oT];
        }
      }
      if (C.markerAt === "to") {
        let iT = my(C.type, t, "up"),
          aT = d.y + d.height;
        if (aT < x) for (let oT = 0; oT < iT.length; oT++) {
          let TT = M - Math.floor(iT.length / 2) + oT;
          if (TT >= 0 && TT < k) f[TT][aT] = iT[oT];
        }
      }
    }
    if (O.label) {
      let Q = ` ${O.label} `,
        W = Math.floor((D + M) / 2),
        eT;
      if (B < V) eT = Math.floor((B + 1 + V - 1) / 2);else if (d.y + d.height - 1 < j.y) {
        let aT = d.y + d.height - 1;
        eT = Math.floor((aT + 1 + j.y - 1) / 2);
      } else eT = Math.max(B, d.y + d.height - 1) + 2;
      let iT = W - Math.floor(Q.length / 2);
      for (let aT = 0; aT < Q.length; aT++) {
        let oT = iT + aT;
        if (oT >= 0 && oT < k && eT >= 0 && eT < x) f[oT][eT] = Q[aT];
      }
    }
  }
  return fW(f);
}