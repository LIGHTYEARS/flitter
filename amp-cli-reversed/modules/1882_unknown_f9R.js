function f9R(T, R, a, e) {
  let t = {
    name: T.label,
    nodes: [],
    parent: R,
    children: [],
    minX: 0,
    minY: 0,
    maxX: 0,
    maxY: 0
  };
  for (let r of T.nodeIds) {
    let h = a.get(r);
    if (h) t.nodes.push(h);
  }
  e.push(t);
  for (let r of T.children) {
    let h = f9R(r, t, a, e);
    t.children.push(h);
    for (let i of h.nodes) if (!t.nodes.includes(i)) t.nodes.push(i);
  }
  return t;
}