function Px0(T) {
  let R = [];
  for (let a of T) {
    let e = R[R.length - 1];
    if (e && e.type === "tool" && a.type === "tool") {
      let t = e.tool,
        r = a.tool,
        h = e.timestampLookupID ?? a.timestampLookupID;
      if (t.kind === "edit" && r.kind === "edit" && t.path === r.path) {
        let i = t.diff && r.diff ? `${t.diff}
${r.diff}` : r.diff ?? t.diff,
          c = r.status === "error" ? 0 : t.linesAdded + r.linesAdded,
          s = r.status === "error" ? 0 : t.linesDeleted + r.linesDeleted;
        R[R.length - 1] = {
          type: "tool",
          tool: {
            kind: "edit",
            rowID: t.rowID ?? r.rowID,
            path: t.path,
            status: r.status,
            diff: i,
            linesAdded: c,
            linesDeleted: s,
            error: r.error ?? t.error
          },
          ...(h !== void 0 ? {
            timestampLookupID: h
          } : {})
        };
        continue;
      }
      if (t.kind === "create-file" && r.kind === "create-file" && t.path === r.path) {
        R[R.length - 1] = {
          type: "tool",
          tool: {
            ...r,
            rowID: t.rowID ?? r.rowID
          },
          ...(h !== void 0 ? {
            timestampLookupID: h
          } : {})
        };
        continue;
      }
      if (t.kind === "create-file" && r.kind === "edit" && t.path === r.path) {
        let i = t.content && r.diff ? `${efT(t.content, tfT(t.path))}
${r.diff}` : r.diff ?? (t.content ? efT(t.content, tfT(t.path)) : void 0),
          c = r.status === "error" ? 0 : t.linesAdded + r.linesAdded,
          s = r.status === "error" ? 0 : r.linesDeleted;
        R[R.length - 1] = {
          type: "tool",
          tool: {
            kind: "edit",
            rowID: t.rowID ?? r.rowID,
            path: t.path,
            status: r.status,
            diff: i,
            linesAdded: c,
            linesDeleted: s,
            error: r.error ?? t.error
          },
          ...(h !== void 0 ? {
            timestampLookupID: h
          } : {})
        };
        continue;
      }
    }
    R.push(a);
  }
  return R;
}