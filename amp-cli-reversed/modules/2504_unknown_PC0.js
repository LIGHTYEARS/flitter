function PC0(T, R) {
  if (R.header && R.header.length > 0) throw Error("HTTP headers cannot be used with command-based MCP servers. Use --env instead");
  let a,
    e,
    t = T.indexOf("--");
  if (t !== -1) {
    let h = T.slice(t + 1);
    if (h.length === 0) throw Error("No command provided after -- separator");
    a = h[0], e = h.length > 1 ? h.slice(1) : void 0;
  } else {
    if (R.env && R.env.length > 0 && T.length === 0) throw Error("Environment variables provided but no command specified. Use: amp mcp add <name> --env KEY=VAL -- <command>");
    a = T[0], e = T.length > 1 ? T.slice(1) : void 0;
  }
  let r = kC0(R.env || []);
  return {
    command: a,
    args: e,
    env: Object.keys(r).length > 0 ? r : void 0
  };
}