function a2(T, R) {
  return T.subgraphs.some(a => a.nodes.includes(R));
}
function e2(T, R) {
  for (let a of T.subgraphs) if (a.nodes.includes(R)) return a;
  return null;
}
function R50(T, R) {
  let a = e2(T, R);
  if (!a) return !1;
  let e = !1;
  for (let t of T.edges) if (t.to === R) {
    if (e2(T, t.from) !== a) {
      e = !0;
      break;
    }
  }
  if (!e) return !1;
  for (let t of a.nodes) {
    if (t === R || !t.gridCoord) continue;
    let r = !1;
    for (let h of T.edges) if (h.to === t) {
      if (e2(T, h.from) !== a) {
        r = !0;
        break;
      }
    }
    if (r && t.gridCoord.y < R.gridCoord.y) return !1;
  }
  return !0;
}