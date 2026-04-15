function vU0(T) {
  let R = new Map(),
    a = new Map(),
    e = new Map(),
    t = [];
  for (let r of T) R.set(r.id, r);
  for (let r of T) {
    let h = r.relationships.find(i => i.role === "child" && R.has(i.threadID) && (i.type === "fork" || i.type === "handoff"));
    if (h) {
      e.set(r.id, h.type);
      let i = h.threadID,
        c = a.get(i) || [];
      c.push(r), a.set(i, c);
    } else t.push(r);
  }
  return frT.flatten(t, r => a.get(r.id)).map(r => ({
    ...r.item,
    depth: r.depth,
    isLast: r.isLast,
    ancestorsAreLast: r.ancestorsAreLast,
    relationshipType: e.get(r.item.id)
  }));
}