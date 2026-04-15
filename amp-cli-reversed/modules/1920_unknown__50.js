function _50(T) {
  let R = {
      entities: [],
      relationships: []
    },
    a = new Map(),
    e = null;
  for (let t = 1; t < T.length; t++) {
    let r = T[t];
    if (e) {
      if (r === "}") {
        e = null;
        continue;
      }
      let c = b50(r);
      if (c) e.attributes.push(c);
      continue;
    }
    let h = r.match(/^(\S+)\s*\{$/);
    if (h) {
      let c = h[1];
      e = r2(a, c);
      continue;
    }
    let i = m50(r);
    if (i) {
      r2(a, i.entity1), r2(a, i.entity2), R.relationships.push(i);
      continue;
    }
  }
  return R.entities = [...a.values()], R;
}