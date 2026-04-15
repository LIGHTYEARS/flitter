function sq0(T) {
  let R = T[0].match(/^(?:graph|flowchart)\s+(TD|TB|LR|BT|RL)\s*$/i);
  if (!R) throw Error(`Invalid mermaid header: "${T[0]}". Expected "graph TD", "flowchart LR", "stateDiagram-v2", etc.`);
  let a = {
      direction: R[1].toUpperCase(),
      nodes: new Map(),
      edges: [],
      subgraphs: [],
      classDefs: new Map(),
      classAssignments: new Map(),
      nodeStyles: new Map()
    },
    e = [];
  for (let t = 1; t < T.length; t++) {
    let r = T[t],
      h = r.match(/^classDef\s+(\w+)\s+(.+)$/);
    if (h) {
      let l = h[1],
        o = h[2],
        n = LgT(o);
      a.classDefs.set(l, n);
      continue;
    }
    let i = r.match(/^class\s+([\w,-]+)\s+(\w+)$/);
    if (i) {
      let l = i[1].split(",").map(n => n.trim()),
        o = i[2];
      for (let n of l) a.classAssignments.set(n, o);
      continue;
    }
    let c = r.match(/^style\s+([\w,-]+)\s+(.+)$/);
    if (c) {
      let l = c[1].split(",").map(n => n.trim()),
        o = LgT(c[2]);
      for (let n of l) a.nodeStyles.set(n, {
        ...a.nodeStyles.get(n),
        ...o
      });
      continue;
    }
    let s = r.match(/^direction\s+(TD|TB|LR|BT|RL)\s*$/i);
    if (s && e.length > 0) {
      e[e.length - 1].direction = s[1].toUpperCase();
      continue;
    }
    let A = r.match(/^subgraph\s+(.+)$/);
    if (A) {
      let l = A[1].trim(),
        o = l.match(/^([\w-]+)\s*\[(.+)\]$/),
        n,
        p;
      if (o) n = o[1], p = o[2];else p = l, n = l.replace(/\s+/g, "_").replace(/[^\w]/g, "");
      let _ = {
        id: n,
        label: p,
        nodeIds: [],
        children: []
      };
      e.push(_);
      continue;
    }
    if (r === "end") {
      let l = e.pop();
      if (l) if (e.length > 0) e[e.length - 1].children.push(l);else a.subgraphs.push(l);
      continue;
    }
    _q0(r, a, e);
  }
  return a;
}