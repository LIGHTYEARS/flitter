function UO0(T, R) {
  let a = -1,
    e = !0,
    t = 0,
    r = [0, 0, 0, 0],
    h = [0, 0, 0, 0],
    i = !1,
    c = 0,
    s,
    A,
    l,
    o = new dQT();
  while (++a < T.length) {
    let n = T[a],
      p = n[1];
    if (n[0] === "enter") {
      if (p.type === "tableHead") {
        if (i = !1, c !== 0) aIT(o, R, c, s, A), A = void 0, c = 0;
        s = {
          type: "table",
          start: Object.assign({}, p.start),
          end: Object.assign({}, p.end)
        }, o.add(a, 0, [["enter", s, R]]);
      } else if (p.type === "tableRow" || p.type === "tableDelimiterRow") {
        if (e = !0, l = void 0, r = [0, 0, 0, 0], h = [0, a + 1, 0, 0], i) i = !1, A = {
          type: "tableBody",
          start: Object.assign({}, p.start),
          end: Object.assign({}, p.end)
        }, o.add(a, 0, [["enter", A, R]]);
        t = p.type === "tableDelimiterRow" ? 2 : A ? 3 : 1;
      } else if (t && (p.type === "data" || p.type === "tableDelimiterMarker" || p.type === "tableDelimiterFiller")) {
        if (e = !1, h[2] === 0) {
          if (r[1] !== 0) h[0] = h[1], l = F4(o, R, r, t, void 0, l), r = [0, 0, 0, 0];
          h[2] = a;
        }
      } else if (p.type === "tableCellDivider") if (e) e = !1;else {
        if (r[1] !== 0) h[0] = h[1], l = F4(o, R, r, t, void 0, l);
        r = h, h = [r[1], a, 0, 0];
      }
    } else if (p.type === "tableHead") i = !0, c = a;else if (p.type === "tableRow" || p.type === "tableDelimiterRow") {
      if (c = a, r[1] !== 0) h[0] = h[1], l = F4(o, R, r, t, a, l);else if (h[1] !== 0) l = F4(o, R, h, t, a, l);
      t = 0;
    } else if (t && (p.type === "data" || p.type === "tableDelimiterMarker" || p.type === "tableDelimiterFiller")) h[3] = a;
  }
  if (c !== 0) aIT(o, R, c, s, A);
  o.consume(R.events), a = -1;
  while (++a < R.events.length) {
    let n = R.events[a];
    if (n[0] === "enter" && n[1].type === "table") n[1]._align = wO0(R.events, a);
  }
  return T;
}