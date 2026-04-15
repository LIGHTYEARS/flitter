function zlR(T) {
  let R = new Map();
  return T.messages.forEach(a => {
    if (a.role !== "assistant") return;
    a.content.forEach(e => {
      let t = HET(e);
      if (!t) return;
      let {
          name: r,
          input: h
        } = t,
        i,
        c = null;
      if (r === "edit_file") {
        if ("path" in h && typeof h.path === "string" && "old_str" in h && "new_str" in h) {
          i = h.path;
          let {
            old_str: s,
            new_str: A
          } = h;
          c = kx(s, A);
        }
      } else if (r === "apply_patch") {
        for (let s of WET(h)) {
          let A = xiT(s.path, T.env?.initial?.trees);
          if (A) {
            let l = R.get(A) ?? {
              added: 0,
              changed: 0,
              deleted: 0
            };
            l.added += s.diffStat.added, l.changed += s.diffStat.changed, l.deleted += s.diffStat.deleted, R.set(A, l);
          }
        }
        return;
      } else if ((r === "write_file" || r === "create_file") && "path" in h && typeof h.path === "string" && "content" in h && typeof h.content === "string") i = h.path, c = xx(h.content);
      if (i && c) {
        let s = xiT(i, T.env?.initial?.trees);
        if (s) {
          let A = R.get(s) ?? {
            added: 0,
            changed: 0,
            deleted: 0
          };
          A.added += c.added, A.changed += c.changed, A.deleted += c.deleted, R.set(s, A);
        }
      }
    });
  }), R;
}