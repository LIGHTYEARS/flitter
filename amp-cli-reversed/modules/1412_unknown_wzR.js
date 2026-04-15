async function wzR(T, R = 1000) {
  let a = qU(T);
  if (!a) return [];
  try {
    let {
        stdout: e
      } = await xzT(PzT("git", ["log", "--no-decorate", `-${R}`, "--format=%H\t%h\t%ar\t%s"], {
        cwd: a,
        encoding: "utf8",
        maxBuffer: 1048576
      }), kzT),
      t = [];
    for (let r of e.split(`
`)) {
      if (!r.trim()) continue;
      let h = r.split("\t"),
        [i, c, s, ...A] = h;
      if (!i || !c || !s || A.length === 0) continue;
      t.push({
        hash: i,
        shortHash: c,
        relativeDate: s,
        message: A.join("\t")
      });
    }
    return t;
  } catch {
    return [];
  }
}