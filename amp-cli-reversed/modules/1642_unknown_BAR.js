async function BAR(T) {
  let R = await B0T(),
    a = new Map();
  for (let e of R) {
    let t = U0T(e),
      r = T.find(i => H0T(i.command) === t);
    if (!r) continue;
    let h = await ICT(e);
    for (let i of h) {
      let c = gCT(i.paths);
      if (c.length === 0) continue;
      let s = c.join("\x00"),
        A = a.get(s);
      if (A && A.timestamp >= i.lastOpenedAt) continue;
      a.set(s, {
        config: {
          workspaceFolders: c,
          port: 0,
          ideName: "Zed",
          authToken: "",
          pid: r.pid,
          connection: "query",
          workspaceId: i.workspaceId
        },
        timestamp: i.lastOpenedAt
      });
    }
  }
  return [...a.values()].map(e => e.config);
}