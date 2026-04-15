function vq0(T, R, a, e) {
  let t = new Map();
  Sq0(T, R, t);
  let r = new Map();
  function h(i) {
    let c = t.get(i);
    if (!c) return;
    for (let s of i.children) h(s);
    for (let s of i.nodeIds) if (!r.has(s)) r.set(s, c);
  }
  for (let i of T) h(i);
  for (let i of R) i.nodes = i.nodes.filter(c => {
    let s;
    for (let [l, o] of a) if (o === c) {
      s = l;
      break;
    }
    if (!s) return !1;
    let A = r.get(s);
    if (!A) return !0;
    return jq0(i, A);
  });
}