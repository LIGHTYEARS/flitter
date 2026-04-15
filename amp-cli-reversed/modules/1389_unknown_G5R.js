function G5R(T, R) {
  let a = [...T].sort((e, t) => e.startLine - t.startLine);
  for (let e = 1; e < a.length; e++) {
    let t = a[e - 1],
      r = a[e],
      h = t.startLine + t.deleteCount;
    if (r.startLine < h) throw Error(`Overlapping patch chunks in ${R}: replacement starting at line ${r.startLine + 1} overlaps previous replacement ending at line ${h}.`);
  }
}