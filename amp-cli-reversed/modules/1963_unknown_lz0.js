function lz0(T, R) {
  if (T.startsWith("builtin://")) return {
    scope: "builtin"
  };
  if (!T.startsWith("file://")) return {
    scope: "global"
  };
  try {
    let a = iz0(gW(T)),
      e = phT(),
      t = nz0(a, R);
    if (Vo(a, ".config", "agents", "skills") || Vo(a, ".config", "amp", "skills") || Vo(a, ".claude", "plugins", "cache")) return {
      scope: "global",
      pathHint: t
    };
    if (Vo(a, ".agents", "skills")) return {
      scope: vB(a, jS(e, ".agents", "skills")) ? "global" : "local",
      pathHint: t
    };
    if (Vo(a, ".claude", "skills")) return {
      scope: vB(a, jS(e, ".claude", "skills")) ? "global" : "local",
      pathHint: t
    };
    if (R) {
      let r = _hT(R, a);
      if (r && !r.startsWith("..")) return {
        scope: "local",
        pathHint: t
      };
    }
  } catch {
    return {
      scope: "global"
    };
  }
  return {
    scope: "global"
  };
}