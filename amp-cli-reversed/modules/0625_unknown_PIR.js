async function PIR(T, R, a) {
  let e = [];
  await Promise.all(T.map(async s => {
    try {
      let A = Ht(s),
        l = await R.stat(A);
      if (!l.isDirectory) {
        let o = Mr(s, a);
        e.push({
          uri: s,
          relativePath: o,
          estimatedTokens: mIR(l.size)
        });
      }
    } catch {}
  }));
  let t = T.map(s => e.find(A => A.uri === s)).filter(s => s !== void 0),
    r = [],
    h = [],
    i = DwT,
    c = 0;
  for (let s of t) if (i >= s.estimatedTokens) r.push(s.uri), i -= s.estimatedTokens, c += s.estimatedTokens;else h.push(s.relativePath);
  return {
    filesToMention: r,
    filesAsPlainPaths: h,
    totalEstimatedTokens: c
  };
}