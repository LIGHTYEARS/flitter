async function Eu(T, R, a, e, t, r, h, i, c = "skill") {
  try {
    await T.stat(R, {
      signal: i
    });
    let s = await y7T(T, R, i);
    for (let A of s) {
      let l = MR.dirname(A),
        o = await b7T(T, l);
      if (!a.has(o)) {
        a.add(o);
        try {
          let n = await T.readFile(A, {
              signal: i
            }),
            {
              frontmatter: p,
              body: _
            } = n7T(n),
            m = MR.basename(l),
            b = A7T(p, m);
          if (b.length > 0) for (let P of b) J.warn(`Skill "${p.name}" frontmatter warning`, {
            field: P.field,
            message: P.message,
            path: d0(A)
          });
          if (p.isolatedContext) continue;
          if (e.get(p.name)) {
            J.debug("Skipping duplicate skill", {
              name: p.name,
              path: d0(A)
            });
            continue;
          }
          e.set(p.name, o);
          let y = await _7T(T, l, i),
            u = await u7T(T, l, i);
          t.push({
            name: p.name,
            description: p.description,
            frontmatter: p,
            content: _,
            baseDir: d0(l),
            mcpServers: y,
            builtinTools: p["builtin-tools"],
            files: u.length > 0 ? u : void 0
          });
        } catch (n) {
          J.warn(`Failed to load ${c}`, {
            path: d0(A),
            error: n
          }), r.push(p7T(A, n));
        }
      }
    }
  } catch (s) {
    if (!Er(s)) J.debug(`Failed to process ${c} directory`, {
      path: R.toString(),
      error: s
    });
  }
}