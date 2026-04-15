function ZDR(T, R) {
  let a = T.usage;
  if (!a) return;
  let e = a.cached_tokens ?? a.prompt_tokens_details?.cached_tokens ?? 0;
  return {
    model: T.model,
    maxInputTokens: R,
    inputTokens: 0,
    cacheReadInputTokens: e,
    cacheCreationInputTokens: a.prompt_tokens - e,
    outputTokens: a.completion_tokens,
    totalInputTokens: a.prompt_tokens,
    timestamp: new Date().toISOString()
  };
}