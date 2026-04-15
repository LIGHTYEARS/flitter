function Ml0(T) {
  if (!T) return;
  return {
    input_tokens: T.inputTokens || 0,
    cache_creation_input_tokens: T.cacheCreationInputTokens ?? void 0,
    cache_read_input_tokens: T.cacheReadInputTokens ?? void 0,
    output_tokens: T.outputTokens || 0,
    max_tokens: T.maxInputTokens,
    service_tier: "standard"
  };
}