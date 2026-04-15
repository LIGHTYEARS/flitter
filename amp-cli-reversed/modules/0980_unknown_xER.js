function i_T(T) {
  let R = T.toLowerCase();
  switch (R) {
    case "minimal":
    case "low":
    case "medium":
    case "high":
      return R;
    default:
      return;
  }
}
async function* xER(T, R, a, e, t, r, h, i, c, s, A) {
  let l = sU(T, A),
    o = await r.configService.getLatest(h),
    n = await oU(o, {
      threadMeta: t,
      messageId: i,
      serviceAuthToken: s
    }),
    p = {
      model: l.name,
      contents: O8(R),
      config: {
        seed: Date.now() % 1e4,
        tools: V8T(a),
        systemInstruction: e,
        maxOutputTokens: l.maxOutputTokens,
        temperature: 1,
        thinkingConfig: {
          includeThoughts: i_T(c ?? "") !== "minimal",
          thinkingLevel: kER(i_T(c ?? "") ?? o.settings["gemini.thinkingLevel"])
        },
        abortSignal: h
      }
    },
    _ = await n.models.generateContentStream(p),
    m;
  for await (let b of _) m = b, yield b;
  return {
    model: T,
    "~debugUsage": {
      model: T,
      maxInputTokens: l.contextWindow - l.maxOutputTokens,
      inputTokens: 0,
      outputTokens: (m?.usageMetadata?.candidatesTokenCount ?? 0) + (m?.usageMetadata?.thoughtsTokenCount ?? 0),
      totalInputTokens: m?.usageMetadata?.promptTokenCount ?? 0,
      cacheCreationInputTokens: (m?.usageMetadata?.promptTokenCount ?? 0) - (m?.usageMetadata?.cachedContentTokenCount ?? 0),
      cacheReadInputTokens: m?.usageMetadata?.cachedContentTokenCount ?? 0,
      timestamp: new Date().toISOString()
    }
  };
}