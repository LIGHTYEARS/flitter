async function uF0(T, R, a, e, t, r) {
  let h = await X3(R, T),
    i = r ? null : mF0("Searching threads...");
  try {
    let c = new URLSearchParams();
    if (c.set("q", a), c.set("limit", String(e)), t > 0) c.set("offset", String(t));
    let s = await fi(`/api/threads/find?${c.toString()}`, void 0, h.configService);
    if (i?.stop(), !s.ok) {
      let n = await s.text();
      Be.write(`Search failed: ${s.status} ${n}
`), process.exit(1);
    }
    let A = await s.json();
    if (r) {
      let n = A.threads.map(p => ({
        id: p.id,
        title: p.title || null,
        updatedAt: p.updatedAt
      }));
      C9.write(JSON.stringify(n, null, 2) + `
`), await h.asyncDispose(), process.exit(0);
    }
    if (A.threads.length === 0) C9.write(`No threads found matching your query.
`), process.exit(0);
    let l = ["Title", "Last Updated", "Thread ID"],
      o = A.threads.map(n => {
        let p = n.title || "Untitled",
          _ = h3R(new Date(n.updatedAt));
        return [p, _, n.id];
      });
    if (i3R(l, o, {
      columnFormatters: [(n, p) => {
        return (n.length > p ? n.substring(0, p - 3) + "..." : n).padEnd(p);
      }, void 0, (n, p) => oR.green(n.padEnd(p))],
      truncateColumnIndex: 0
    }), A.hasMore) C9.write(oR.dim(`
More results available. Use --limit to see more.
`));
    await h.asyncDispose(), process.exit(0);
  } catch (c) {
    i?.stop(), await h.asyncDispose(), d8(`Error searching threads: ${c instanceof Error ? c.message : String(c)}
`);
  }
}