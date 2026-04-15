function v50(T) {
  let R = JSON.parse(T.data);
  if (!Array.isArray(R)) {
    let r = g50(R);
    if (!r) throw Error("Expected a JSON array");
    R = r;
  }
  if (R.length > 0) {
    let r = R[0],
      h = r ? String(r[T.xColumn] ?? "") : "";
    if (/^\d{4}-\d{2}-\d{2}/.test(h)) R.sort((i, c) => {
      if (typeof i !== "object" || i === null || typeof c !== "object" || c === null) return 0;
      let s = String(i[T.xColumn] ?? ""),
        A = String(c[T.xColumn] ?? "");
      return s < A ? -1 : s > A ? 1 : 0;
    });
  }
  let a = T.yColumns.length > 1 || !!T.groupColumn,
    e;
  if (T.chartType === "bar") {
    if (T.horizontal) e = "horizontal-bar";else if (T.stacked && a) e = "stacked-bar";else e = "bar";
  } else if (T.chartType === "area") e = T.stacked ? "stacked-area" : "line";else e = "line";
  let t = [];
  if (T.groupColumn) {
    let r = T.yColumns[0];
    if (!r) throw Error("groupColumn requires at least one yColumn");
    let h = [],
      i = new Set(),
      c = new Map(),
      s = [];
    for (let A of R) {
      if (typeof A !== "object" || A === null) continue;
      let l = A,
        o = l[T.xColumn],
        n = l[T.groupColumn],
        p = l[r];
      if (o === void 0 || n === void 0 || p === void 0) continue;
      let _ = Number(p);
      if (!Number.isFinite(_)) continue;
      let m = String(o),
        b = String(n);
      if (!i.has(m)) i.add(m), h.push(m);
      let y = c.get(b);
      if (!y) y = new Map(), c.set(b, y), s.push(b);
      y.set(m, (y.get(m) ?? 0) + _);
    }
    for (let A of s) {
      let l = c.get(A),
        o = [];
      for (let n of h) if (o.push({
        label: n,
        value: l.get(n) ?? 0
      }), o.length >= FgT) break;
      t.push({
        name: A,
        points: o
      });
    }
  } else for (let r of T.yColumns) {
    let h = [];
    for (let i of R) {
      if (typeof i !== "object" || i === null) continue;
      let c = i,
        s = c[T.xColumn],
        A = c[r];
      if (s === void 0 || A === void 0) continue;
      let l = Number(A);
      if (!Number.isFinite(l)) continue;
      let o = {
        label: String(s),
        value: l
      };
      if (typeof c.link === "string") o.link = c.link;
      if (T.hoverColumns && T.hoverColumns.length > 0) {
        let n = [];
        for (let p of T.hoverColumns) {
          let _ = c[p];
          if (_ !== void 0) n.push(`${p}: ${String(_)}`);
        }
        if (n.length > 0) o.meta = n.join(", ");
      } else if (typeof c.meta === "string") o.meta = c.meta;
      if (h.push(o), h.length >= FgT) break;
    }
    t.push({
      name: T.yColumns.length > 1 ? r : "default",
      points: h
    });
  }
  return {
    title: T.title ?? "Chart",
    subtitle: T.subtitle,
    series: t,
    chartType: e,
    xAxisLabel: T.xAxisLabel ?? T.xColumn,
    yAxisLabel: T.yAxisLabel ?? T.yColumns[0],
    sourceQuery: T.cmd ? $50(T.cmd) : void 0
  };
}