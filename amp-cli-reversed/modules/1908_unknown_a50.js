function a50(T) {
  let R = T.subgraphs.filter(a => a.parent === null && a.nodes.length > 0);
  for (let a = 0; a < R.length; a++) for (let e = a + 1; e < R.length; e++) {
    let t = R[a],
      r = R[e];
    if (t.minX < r.maxX && t.maxX > r.minX) {
      if (t.maxY >= r.minY - 1 && t.minY < r.minY) r.minY = t.maxY + 1 + 1;else if (r.maxY >= t.minY - 1 && r.minY < t.minY) t.minY = r.maxY + 1 + 1;
    }
    if (t.minY < r.maxY && t.maxY > r.minY) {
      if (t.maxX >= r.minX - 1 && t.minX < r.minX) r.minX = t.maxX + 1 + 1;else if (r.maxX >= t.minX - 1 && r.minX < t.minX) t.minX = r.maxX + 1 + 1;
    }
  }
}