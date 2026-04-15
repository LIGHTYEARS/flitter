function vmR(T, R) {
  if (Vf(T.name, R)) return !0;
  if (typeof T.source === "object" && "mcp" in T.source) {
    let a = zLT(T.name);
    if (a) {
      if (T.source.mcp.replace(/[\s-]+/g, "_") === a.server) {
        if (Vf(a.tool, R)) return !0;
        let e = `mcp__${T.source.mcp}__${a.tool}`;
        if (Vf(e, R)) return !0;
      }
    }
  }
  if (T.source === "builtin" && Vf(`builtin:${T.name}`, R)) return !0;
  if (typeof T.source === "object" && "toolbox" in T.source && Vf(`toolbox:${T.name}`, R)) return !0;
  return !1;
}