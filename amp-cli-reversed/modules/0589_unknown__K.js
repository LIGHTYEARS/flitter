function i5(T) {
  return UL(T, EfR);
}
function DfR(T) {
  return T ? T.length >= bK : !1;
}
function $y(T) {
  if (T.nextMessageId === void 0) T.nextMessageId = 0;
  return T.nextMessageId++;
}
function wfR(T, R) {
  let a = _K(T["~debug"]?.lastInferenceUsage, R);
  if (!a) return;
  T["~debug"] = {
    ...(T["~debug"] ?? {}),
    lastInferenceUsage: a
  };
}
function _K(T, R) {
  if (!T) return R;
  if (!R) return T;
  let a = (t, r) => Math.max(t, r),
    e = (t, r) => {
      if (r === null) return t;
      if (t === null) return r;
      return Math.max(t, r);
    };
  return {
    model: R.model ?? T.model,
    maxInputTokens: a(T.maxInputTokens, R.maxInputTokens),
    inputTokens: a(T.inputTokens, R.inputTokens),
    outputTokens: a(T.outputTokens, R.outputTokens),
    cacheCreationInputTokens: e(T.cacheCreationInputTokens, R.cacheCreationInputTokens),
    cacheReadInputTokens: e(T.cacheReadInputTokens, R.cacheReadInputTokens),
    totalInputTokens: a(T.totalInputTokens, R.totalInputTokens),
    thinkingBudget: R.thinkingBudget ?? T.thinkingBudget,
    timestamp: R.timestamp ?? T.timestamp
  };
}