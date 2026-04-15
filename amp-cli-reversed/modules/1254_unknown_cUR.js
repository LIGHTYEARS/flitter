async function cUR(T, R, a) {
  let e;
  try {
    e = await R(T);
    let {
        mcpService: t,
        settings: r
      } = e,
      h = new Map(),
      i = !1,
      c = !1,
      s = !1;
    await new Promise((A, l) => {
      let o = t.servers.subscribe({
        next: async n => {
          let p = n;
          if (a) p = n.filter(_ => _.name === a);
          if (!i && p.length === 0 && a) {
            process.stderr.write(`MCP server "${a}" not found
`), l(Error("Server not found"));
            return;
          }
          if (!i && p.length === 0 && !a) {
            process.stdout.write(`No MCP servers configured
`), A();
            return;
          }
          if (!s) {
            let _ = r.getSettingsFilePath(),
              m = `${r.getWorkspaceRootPath()}/.amp/settings.json`;
            process.stdout.write(`User settings: ${_}
`), process.stdout.write(`Workspace settings: ${m}

`), s = !0;
          }
          c = await m0(t.isWorkspaceTrusted());
          for (let _ of p) {
            let m = iUR(_, c),
              b = h.get(_.name);
            if (m !== b) process.stdout.write(m + `
`), h.set(_.name, m), i = !0;
          }
          if (p.every(_ => {
            if (_.status.type === "failed" || _.status.type === "denied" || _.status.type === "awaiting-approval" || _.status.type === "blocked-by-registry") return !0;
            if (_.status.type === "connected" && _.tools instanceof Error) return !0;
            if (_.status.type === "connected" && Array.isArray(_.tools) && _.tools.length > 0) return !0;
            return !1;
          }) && p.length > 0) o.unsubscribe(), A();
        },
        error: n => {
          l(n);
        }
      });
      setTimeout(() => {
        if (o.unsubscribe(), !i) l(Error("Timeout waiting for MCP servers"));else A();
      }, 30000);
    }), process.exit(0);
  } catch (t) {
    process.stderr.write((t instanceof Error ? t.message : String(t)) + `
`), process.exit(1);
  } finally {
    if (e) await e.asyncDispose();
  }
}