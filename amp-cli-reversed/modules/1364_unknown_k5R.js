async function k5R(T, R, a, e = new Set(), t = !1, r) {
  let h = await P5R(a, T, t),
    i = [];
  for (let c of h) try {
    if (c.skills && r) {
      c.skillDefs = {};
      for (let o of c.skills) {
        let n = r.get(o);
        if (n) c.skillDefs[o] = n;
      }
    }
    let s = `sa__${x5R(c.name)}`;
    if (e.has(s)) {
      J.info("Skipping duplicate custom agent", {
        name: s,
        path: c.sourcePath
      });
      continue;
    }
    let A = {
        ...f5R(c),
        name: s
      },
      l = I5R(c, s);
    R.registerTool({
      spec: A,
      fn: l
    }), e.add(s), i.push(zR.file(c.sourcePath)), J.info("Registered custom agent", {
      name: s,
      model: c.model,
      tools: c.toolPatterns
    });
  } catch (s) {
    J.error("Failed to register custom agent", {
      name: c.name,
      path: c.sourcePath,
      error: String(s)
    });
  }
  return i;
}