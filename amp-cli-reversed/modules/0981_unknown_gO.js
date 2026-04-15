async function gO(T, R, a, e, t, r, h, i, c) {
  let s = sU(T),
    A = await (await oU(t, {
      threadMeta: e,
      featureHeader: i,
      serviceAuthToken: c
    })).models.generateContent({
      model: s.name,
      contents: O8(R),
      config: {
        tools: V8T(a),
        seed: Date.now() % 1e4,
        temperature: 0.1,
        maxOutputTokens: s.maxOutputTokens,
        abortSignal: r,
        ...h
      }
    });
  return {
    message: A,
    "~debugUsage": {
      model: s.name,
      maxInputTokens: s.contextWindow - s.maxOutputTokens,
      inputTokens: 0,
      outputTokens: (A.usageMetadata?.candidatesTokenCount ?? 0) + (A.usageMetadata?.thoughtsTokenCount ?? 0),
      totalInputTokens: A.usageMetadata?.promptTokenCount ?? 0,
      cacheCreationInputTokens: (A.usageMetadata?.promptTokenCount ?? 0) - (A.usageMetadata?.cachedContentTokenCount ?? 0),
      cacheReadInputTokens: A.usageMetadata?.cachedContentTokenCount ?? 0,
      timestamp: new Date().toISOString()
    }
  };
}