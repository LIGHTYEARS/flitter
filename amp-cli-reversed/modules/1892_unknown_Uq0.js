function Uq0(T, R, a, e, t, r) {
  let h = am(R, a),
    i = [],
    c = r ? "-" : "\u2500",
    s = r ? "|" : "\u2502",
    A = r ? "\\" : "\u2572",
    l = r ? "/" : "\u2571";
  if (M0(h, G3)) for (let o = R.y - e; o >= a.y - t; o--) i.push({
    x: R.x,
    y: o
  }), T[R.x][o] = s;else if (M0(h, w8)) for (let o = R.y + e; o <= a.y + t; o++) i.push({
    x: R.x,
    y: o
  }), T[R.x][o] = s;else if (M0(h, K3)) for (let o = R.x - e; o >= a.x - t; o--) i.push({
    x: o,
    y: R.y
  }), T[o][R.y] = c;else if (M0(h, Z8)) for (let o = R.x + e; o <= a.x + t; o++) i.push({
    x: o,
    y: R.y
  }), T[o][R.y] = c;else if (M0(h, sn)) for (let o = R.x, n = R.y - e; o >= a.x - t && n >= a.y - t; o--, n--) i.push({
    x: o,
    y: n
  }), T[o][n] = A;else if (M0(h, wA)) for (let o = R.x, n = R.y - e; o <= a.x + t && n >= a.y - t; o++, n--) i.push({
    x: o,
    y: n
  }), T[o][n] = l;else if (M0(h, BA)) for (let o = R.x, n = R.y + e; o >= a.x - t && n <= a.y + t; o--, n++) i.push({
    x: o,
    y: n
  }), T[o][n] = l;else if (M0(h, Rm)) for (let o = R.x, n = R.y + e; o <= a.x + t && n <= a.y + t; o++, n++) i.push({
    x: o,
    y: n
  }), T[o][n] = A;
  return i;
}