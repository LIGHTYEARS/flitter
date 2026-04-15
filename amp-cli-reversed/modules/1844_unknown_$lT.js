async function $lT(T, R, a, e = "skill") {
  let t = {
    skills: [],
    errors: []
  };
  try {
    await T.stat(R, {
      signal: a
    });
    let r = await y7T(T, R, a);
    for (let h of r) {
      let i = MR.dirname(h),
        c = await b7T(T, i);
      try {
        let s = await T.readFile(h, {
            signal: a
          }),
          {
            frontmatter: A,
            body: l
          } = n7T(s),
          o = MR.basename(i),
          n = A7T(A, o);
        if (n.length > 0) for (let m of n) J.warn(`Skill "${A.name}" frontmatter warning`, {
          field: m.field,
          message: m.message,
          path: d0(h)
        });
        if (A.isolatedContext) continue;
        let p = await _7T(T, i, a),
          _ = await u7T(T, i, a);
        t.skills.push({
          path: c,
          skill: {
            name: A.name,
            description: A.description,
            frontmatter: A,
            content: l,
            baseDir: d0(i),
            mcpServers: p,
            builtinTools: A["builtin-tools"],
            files: _.length > 0 ? _ : void 0
          }
        });
      } catch (s) {
        J.warn(`Failed to load ${e}`, {
          path: d0(h),
          error: s
        }), t.errors.push(p7T(h, s));
      }
    }
  } catch (r) {
    if (!Er(r)) J.debug(`Failed to process ${e} directory`, {
      path: R.toString(),
      error: r
    });
  }
  return t;
}