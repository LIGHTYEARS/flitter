function JCR({
  model: T,
  status: R,
  usage: a,
  logger: e
}) {
  let t = Ur(e);
  if (!a) return;
  let r = a.input_tokens_details.cached_tokens,
    h = a.input_tokens - r,
    i = E0T(T);
  if (!i) t.warn("[openai-responses] Unknown response model in usage data", {
    model: T
  });
  let c = i ?? oN(P9.OPENAI);
  if (R === "completed" && (a.input_tokens === 0 || a.output_tokens === 0)) t.warn("[openai-responses] Missing token counts in completed response", {
    model: T,
    rawInputTokens: a.input_tokens,
    rawOutputTokens: a.output_tokens,
    cachedTokens: r,
    cacheCreationInputTokens: h,
    outputTokensDetails: a.output_tokens_details
  });
  return {
    model: T,
    maxInputTokens: c.contextWindow - c.maxOutputTokens,
    inputTokens: 0,
    outputTokens: a.output_tokens,
    cacheCreationInputTokens: h,
    cacheReadInputTokens: r,
    totalInputTokens: a.input_tokens,
    timestamp: new Date().toISOString()
  };
}