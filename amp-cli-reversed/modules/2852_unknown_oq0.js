function oq0(T) {
  let R = {
      direction: "TD",
      nodes: new Map(),
      edges: [],
      subgraphs: [],
      classDefs: new Map(),
      classAssignments: new Map(),
      nodeStyles: new Map()
    },
    a = [],
    e = 0,
    t = 0;
  for (let r = 1; r < T.length; r++) {
    let h = T[r],
      i = h.match(/^direction\s+(TD|TB|LR|BT|RL)\s*$/i);
    if (i) {
      if (a.length > 0) a[a.length - 1].direction = i[1].toUpperCase();else R.direction = i[1].toUpperCase();
      continue;
    }
    let c = h.match(/^state\s+(?:"([^"]+)"\s+as\s+)?(\w+)\s*\{$/);
    if (c) {
      let o = c[1] ?? c[2],
        n = {
          id: c[2],
          label: o,
          nodeIds: [],
          children: []
        };
      a.push(n);
      continue;
    }
    if (h === "}") {
      let o = a.pop();
      if (o) if (a.length > 0) a[a.length - 1].children.push(o);else R.subgraphs.push(o);
      continue;
    }
    let s = h.match(/^state\s+"([^"]+)"\s+as\s+(\w+)\s*$/);
    if (s) {
      let o = s[1],
        n = s[2];
      j$(R, a, {
        id: n,
        label: o,
        shape: "rounded"
      });
      continue;
    }
    let A = h.match(/^(\[\*\]|[\w-]+)\s*(-->)\s*(\[\*\]|[\w-]+)(?:\s*:\s*(.+))?$/);
    if (A) {
      let o = A[1],
        n = A[3],
        p = A[4]?.trim() || void 0;
      if (o === "[*]") e++, o = `_start${e > 1 ? e : ""}`, j$(R, a, {
        id: o,
        label: "",
        shape: "state-start"
      });else CgT(R, a, o);
      if (n === "[*]") t++, n = `_end${t > 1 ? t : ""}`, j$(R, a, {
        id: n,
        label: "",
        shape: "state-end"
      });else CgT(R, a, n);
      R.edges.push({
        source: o,
        target: n,
        label: p,
        style: "solid",
        hasArrowStart: !1,
        hasArrowEnd: !0
      });
      continue;
    }
    let l = h.match(/^([\w-]+)\s*:\s*(.+)$/);
    if (l) {
      let o = l[1],
        n = l[2].trim();
      j$(R, a, {
        id: o,
        label: n,
        shape: "rounded"
      });
      continue;
    }
  }
  return R;
}