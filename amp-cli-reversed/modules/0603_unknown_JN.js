function ep(T, R, a) {
  return m0(KfR(T.configService.config, a?.defaultHeaders), R);
}
function JN(T, R, a, e, t) {
  let r = [],
    h = T["anthropic.thinking.enabled"] ?? !0;
  if (T["anthropic.speed"] === "fast" && uK(a, t)) r.push("fast-mode-2026-02-01");
  if (h && T["anthropic.interleavedThinking.enabled"]) r.push("interleaved-thinking-2025-05-14");
  let i;
  if (T["anthropic.speed"] === "fast" && uK(a, t)) i = "anthropic";else if (T["anthropic.provider"]) i = T["anthropic.provider"];
  return {
    ...Xs(),
    ...(r.length > 0 ? {
      "anthropic-beta": r.join(",")
    } : {}),
    ...(i ? {
      "x-amp-override-provider": i
    } : {}),
    [yc]: "amp.chat",
    ...(e != null ? {
      [zA]: String(e)
    } : {}),
    ...Vs(R)
  };
}