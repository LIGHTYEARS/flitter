function jVR(T, R) {
  if (R) return {
    model: T.name,
    maxInputTokens: T.contextWindow - T.maxOutputTokens,
    inputTokens: R.input_tokens,
    outputTokens: R.output_tokens,
    cacheCreationInputTokens: null,
    cacheReadInputTokens: R.input_tokens_details?.cached_tokens ?? null,
    totalInputTokens: R.input_tokens
  };
  return {
    model: T.name,
    maxInputTokens: T.contextWindow - T.maxOutputTokens,
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationInputTokens: null,
    cacheReadInputTokens: null,
    totalInputTokens: 0
  };
}