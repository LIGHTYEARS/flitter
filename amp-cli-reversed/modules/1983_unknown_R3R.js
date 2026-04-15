function R3R(T, R) {
  if (T.getOptionValueSourceWithGlobals("sp") === "cli" && R.sp) return R.sp;
  if (T.getOptionValueSourceWithGlobals("systemPrompt") === "cli" && R.systemPrompt) return R.systemPrompt;
  return;
}