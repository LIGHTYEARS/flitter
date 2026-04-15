function dg(T, R, a) {
  if (!R.has(a)) R.add(a), T.actors.push({
    id: a,
    label: a,
    type: "participant"
  });
}
function c50(T, R) {
  let a = T.split(`
`).map(M => M.trim()).filter(M => M.length > 0 && !M.startsWith("%%")),
    e = i50(a);
  if (e.actors.length === 0) return "";
  let t = R.useAscii,
    r = t ? "-" : "\u2500",
    h = t ? "|" : "\u2502",
    i = t ? "+" : "\u250C",
    c = t ? "+" : "\u2510",
    s = t ? "+" : "\u2514",
    A = t ? "+" : "\u2518",
    l = t ? "+" : "\u252C",
    o = t ? "+" : "\u2534",
    n = t ? "+" : "\u251C",
    p = t ? "+" : "\u2524",
    _ = new Map();
  e.actors.forEach((M, V) => _.set(M.id, V));
  let m = 1,
    b = e.actors.map(M => M.label.length + 2 * m + 2).map(M => Math.ceil(M / 2)),
    y = 3,
    u = Array(Math.max(e.actors.length - 1, 0)).fill(0);
  for (let M of e.messages) {
    let V = _.get(M.from),
      Q = _.get(M.to);
    if (V === Q) continue;
    let W = Math.min(V, Q),
      eT = Math.max(V, Q),
      iT = M.label.length + 4,
      aT = eT - W,
      oT = Math.ceil(iT / aT);
    for (let TT = W; TT < eT; TT++) u[TT] = Math.max(u[TT], oT);
  }
  let P = [b[0]];
  for (let M = 1; M < e.actors.length; M++) {
    let V = Math.max(b[M - 1] + b[M] + 2, u[M - 1] + 2, 10);
    P[M] = P[M - 1] + V;
  }
  let k = [],
    x = [],
    f = new Map(),
    v = new Map(),
    g = new Map(),
    I = [],
    S = y;
  for (let M = 0; M < e.messages.length; M++) {
    for (let Q = 0; Q < e.blocks.length; Q++) if (e.blocks[Q].startIndex === M) S += 2, f.set(Q, S - 1);
    for (let Q = 0; Q < e.blocks.length; Q++) for (let W = 0; W < e.blocks[Q].dividers.length; W++) if (e.blocks[Q].dividers[W].index === M) S += 1, g.set(`${Q}:${W}`, S), S += 1;
    S += 1;
    let V = e.messages[M];
    if (V.from === V.to) x[M] = S + 1, k[M] = S, S += 3;else x[M] = S, k[M] = S + 1, S += 2;
    for (let Q = 0; Q < e.notes.length; Q++) if (e.notes[Q].afterIndex === M) {
      S += 1;
      let W = e.notes[Q],
        eT = W.text.split("\\n"),
        iT = Math.max(...eT.map(tT => tT.length)) + 4,
        aT = eT.length + 2,
        oT = _.get(W.actorIds[0]) ?? 0,
        TT;
      if (W.position === "left") TT = P[oT] - iT - 1;else if (W.position === "right") TT = P[oT] + 2;else if (W.actorIds.length >= 2) {
        let tT = _.get(W.actorIds[1]) ?? oT;
        TT = Math.floor((P[oT] + P[tT]) / 2) - Math.floor(iT / 2);
      } else TT = P[oT] - Math.floor(iT / 2);
      TT = Math.max(0, TT), I.push({
        x: TT,
        y: S,
        width: iT,
        height: aT,
        lines: eT
      }), S += aT;
    }
    for (let Q = 0; Q < e.blocks.length; Q++) if (e.blocks[Q].endIndex === M) S += 1, v.set(Q, S), S += 1;
  }
  S += 1;
  let O = S,
    j = O + y,
    d = P[P.length - 1] ?? 0,
    C = b[b.length - 1] ?? 0,
    L = d + C + 2;
  for (let M = 0; M < e.messages.length; M++) {
    let V = e.messages[M];
    if (V.from === V.to) {
      let Q = _.get(V.from),
        W = P[Q] + 6 + 2 + V.label.length;
      L = Math.max(L, W + 1);
    }
  }
  for (let M of I) L = Math.max(L, M.x + M.width + 1);
  let w = Oh(L, j - 1);
  function D(M, V, Q) {
    let W = Q.length + 2 * m + 2,
      eT = M - Math.floor(W / 2);
    w[eT][V] = i;
    for (let aT = 1; aT < W - 1; aT++) w[eT + aT][V] = r;
    w[eT + W - 1][V] = c, w[eT][V + 1] = h, w[eT + W - 1][V + 1] = h;
    let iT = eT + 1 + m;
    for (let aT = 0; aT < Q.length; aT++) w[iT + aT][V + 1] = Q[aT];
    w[eT][V + 2] = s;
    for (let aT = 1; aT < W - 1; aT++) w[eT + aT][V + 2] = r;
    w[eT + W - 1][V + 2] = A;
  }
  for (let M = 0; M < e.actors.length; M++) {
    let V = P[M];
    for (let Q = y; Q <= O; Q++) w[V][Q] = h;
  }
  for (let M = 0; M < e.actors.length; M++) {
    let V = e.actors[M];
    if (D(P[M], 0, V.label), D(P[M], O, V.label), !t) w[P[M]][y - 1] = l, w[P[M]][O] = o;
  }
  for (let M = 0; M < e.messages.length; M++) {
    let V = e.messages[M],
      Q = _.get(V.from),
      W = _.get(V.to),
      eT = P[Q],
      iT = P[W],
      aT = Q === W,
      oT = V.lineStyle === "dashed",
      TT = V.arrowHead === "filled",
      tT = oT ? t ? "." : "\u254C" : r;
    if (aT) {
      let lT = k[M],
        N = Math.max(4, 4);
      w[eT][lT] = n;
      for (let E = eT + 1; E < eT + N; E++) w[E][lT] = tT;
      w[eT + N][lT] = t ? "+" : "\u2510", w[eT + N][lT + 1] = h;
      let q = eT + N + 2;
      for (let E = 0; E < V.label.length; E++) if (q + E < L) w[q + E][lT + 1] = V.label[E];
      let F = TT ? t ? "<" : "\u25C0" : t ? "<" : "\u25C1";
      w[eT][lT + 2] = F;
      for (let E = eT + 1; E < eT + N; E++) w[E][lT + 2] = tT;
      w[eT + N][lT + 2] = t ? "+" : "\u2518";
    } else {
      let lT = x[M],
        N = k[M],
        q = eT < iT,
        F = Math.floor((eT + iT) / 2) - Math.floor(V.label.length / 2);
      for (let E = 0; E < V.label.length; E++) {
        let U = F + E;
        if (U >= 0 && U < L) w[U][lT] = V.label[E];
      }
      if (q) {
        for (let U = eT + 1; U < iT; U++) w[U][N] = tT;
        let E = TT ? t ? ">" : "\u25B6" : t ? ">" : "\u25B7";
        w[iT][N] = E;
      } else {
        for (let U = iT + 1; U < eT; U++) w[U][N] = tT;
        let E = TT ? t ? "<" : "\u25C0" : t ? "<" : "\u25C1";
        w[iT][N] = E;
      }
    }
  }
  for (let M = 0; M < e.blocks.length; M++) {
    let V = e.blocks[M],
      Q = f.get(M),
      W = v.get(M);
    if (Q === void 0 || W === void 0) continue;
    let eT = L,
      iT = 0;
    for (let tT = V.startIndex; tT <= V.endIndex; tT++) {
      if (tT >= e.messages.length) break;
      let lT = e.messages[tT],
        N = _.get(lT.from) ?? 0,
        q = _.get(lT.to) ?? 0;
      eT = Math.min(eT, P[Math.min(N, q)]), iT = Math.max(iT, P[Math.max(N, q)]);
    }
    let aT = Math.max(0, eT - 4),
      oT = Math.min(L - 1, iT + 4);
    w[aT][Q] = i;
    for (let tT = aT + 1; tT < oT; tT++) w[tT][Q] = r;
    w[oT][Q] = c;
    let TT = V.label ? `${V.type} [${V.label}]` : V.type;
    for (let tT = 0; tT < TT.length && aT + 1 + tT < oT; tT++) w[aT + 1 + tT][Q] = TT[tT];
    w[aT][W] = s;
    for (let tT = aT + 1; tT < oT; tT++) w[tT][W] = r;
    w[oT][W] = A;
    for (let tT = Q + 1; tT < W; tT++) w[aT][tT] = h, w[oT][tT] = h;
    for (let tT = 0; tT < V.dividers.length; tT++) {
      let lT = g.get(`${M}:${tT}`);
      if (lT === void 0) continue;
      let N = B();
      w[aT][lT] = n;
      for (let F = aT + 1; F < oT; F++) w[F][lT] = N;
      w[oT][lT] = p;
      let q = V.dividers[tT].label;
      if (q) {
        let F = `[${q}]`;
        for (let E = 0; E < F.length && aT + 1 + E < oT; E++) w[aT + 1 + E][lT] = F[E];
      }
    }
  }
  for (let M of I) {
    rd(w, M.x + M.width, M.y + M.height), w[M.x][M.y] = i;
    for (let Q = 1; Q < M.width - 1; Q++) w[M.x + Q][M.y] = r;
    w[M.x + M.width - 1][M.y] = c;
    for (let Q = 0; Q < M.lines.length; Q++) {
      let W = M.y + 1 + Q;
      w[M.x][W] = h, w[M.x + M.width - 1][W] = h;
      for (let eT = 0; eT < M.lines[Q].length; eT++) w[M.x + 2 + eT][W] = M.lines[Q][eT];
    }
    let V = M.y + M.height - 1;
    w[M.x][V] = s;
    for (let Q = 1; Q < M.width - 1; Q++) w[M.x + Q][V] = r;
    w[M.x + M.width - 1][V] = A;
  }
  return fW(w);
  function B() {
    return t ? "-" : "\u254C";
  }
}