function yy(T, R) {
  let a = R.settings?.["tools.disable"] ?? [],
    e = R.settings?.["tools.enable"];
  if (e !== void 0 && e.length > 0) {
    if (!vmR(T, e)) return {
      enabled: !1,
      disabledReason: "settings"
    };
  }
  if (Xf(T.name, a)) return {
    enabled: !1,
    disabledReason: "settings"
  };
  if (typeof T.source === "object" && "mcp" in T.source) {
    let t = zLT(T.name);
    if (t) {
      if (T.source.mcp.replace(/[\s-]+/g, "_") === t.server) {
        if (Xf(t.tool, a)) return {
          enabled: !1,
          disabledReason: "settings"
        };
        let r = `mcp__${T.source.mcp}__${t.tool}`;
        if (Xf(r, a)) return {
          enabled: !1,
          disabledReason: "settings"
        };
      }
    }
  }
  if (T.source === "builtin" && Xf(`builtin:${T.name}`, a)) return {
    enabled: !1,
    disabledReason: "settings"
  };
  if (typeof T.source === "object" && "toolbox" in T.source && Xf(`toolbox:${T.name}`, a)) return {
    enabled: !1,
    disabledReason: "settings"
  };
  return {
    enabled: !0
  };
}