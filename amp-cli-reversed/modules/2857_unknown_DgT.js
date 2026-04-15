function DgT(T, R, a) {
  let e = null,
    t = T;
  for (let {
    regex: h,
    shape: i
  } of lq0) {
    let c = T.match(h);
    if (c) {
      e = c[1];
      let s = c[2];
      wgT(R, a, {
        id: e,
        label: s,
        shape: i
      }), t = T.slice(c[0].length);
      break;
    }
  }
  if (e === null) {
    let h = T.match(Aq0);
    if (h) {
      if (e = h[1], !R.nodes.has(e)) wgT(R, a, {
        id: e,
        label: e,
        shape: "rectangle"
      });else k9R(a, e);
      t = T.slice(h[0].length);
    }
  }
  if (e === null) return null;
  let r = t.match(pq0);
  if (r) R.classAssignments.set(e, r[1]), t = t.slice(r[0].length);
  return {
    id: e,
    remaining: t
  };
}