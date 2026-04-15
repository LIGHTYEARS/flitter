function QfR(T) {
  return T.map(R => {
    if (R.type === "text") return {
      ...R,
      text: R.text.trimEnd()
    };
    return R;
  }).filter(R => R.type !== "text" || R.text !== "");
}
async function SwT(T, R, a, e, t, r, h, i) {
  let c = await ep(t, h),
    s = await t.configService.getLatest(h),
    A = s.settings["anthropic.thinking.enabled"] ?? !0;
  T = A ? T : tIR(T);
  let l = O8(f8T(T)),
    o = r ?? dwT,
    n = tp(o),
    p = TU(o),
    _ = {
      model: n,
      max_tokens: lIR,
      messages: l,
      system: a,
      tools: kO(R)
    },
    m = s.settings["anthropic.temperature"];
  if (m !== void 0 && !A) _.temperature = m;
  try {
    let b = await c.messages.create(_, {
      signal: h,
      headers: {
        ...JN(s.settings, e, o, i)
      }
    });
    return {
      message: b,
      "~debugUsage": {
        model: n,
        maxInputTokens: p,
        inputTokens: b.usage.input_tokens,
        outputTokens: b.usage.output_tokens,
        cacheCreationInputTokens: b.usage.cache_creation_input_tokens,
        cacheReadInputTokens: b.usage.cache_read_input_tokens,
        totalInputTokens: b.usage.input_tokens + (b.usage.cache_creation_input_tokens ?? 0) + (b.usage.cache_read_input_tokens ?? 0),
        thinkingBudget: A ? jwT(T) : void 0,
        timestamp: new Date().toISOString()
      }
    };
  } catch (b) {
    throw h?.throwIfAborted(), iIR(b);
  }
}