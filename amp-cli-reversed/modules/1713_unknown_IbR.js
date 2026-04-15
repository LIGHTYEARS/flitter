function IbR(T) {
  if (T.tool !== U8 && T.tool !== Eb) return;
  let R = T.tool === U8,
    a = R ? Eb : U8,
    e = T.matches ? Object.fromEntries(Object.entries(T.matches).map(([t, r]) => {
      if (R && t === "cmd") return ["command", r];
      if (R && t === "cwd") return ["workdir", r];
      if (!R && t === "command") return ["cmd", r];
      if (!R && t === "workdir") return ["cwd", r];
      return [t, r];
    })) : void 0;
  return {
    ...T,
    tool: a,
    matches: e
  };
}