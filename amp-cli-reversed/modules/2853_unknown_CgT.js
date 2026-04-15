function j$(T, R, a) {
  if (!T.nodes.has(a.id)) T.nodes.set(a.id, a);
  if (R.length > 0) {
    let e = R[R.length - 1];
    if (!e.nodeIds.includes(a.id)) e.nodeIds.push(a.id);
  }
}
function CgT(T, R, a) {
  if (!T.nodes.has(a)) j$(T, R, {
    id: a,
    label: a,
    shape: "rounded"
  });else if (R.length > 0) {
    let e = R[R.length - 1];
    if (!e.nodeIds.includes(a)) e.nodeIds.push(a);
  }
}