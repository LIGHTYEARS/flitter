function IwR(T) {
  if (!T || !X9(T)) return !1;
  return T.features.some(R => R.name === dr.TASK_LIST && R.enabled);
}
function gwR(T) {
  if (!T || !X9(T)) return !1;
  return T.features.some(R => R.name === dr.HARNESS_SYSTEM_PROMPT && R.enabled) || Ns(T.user.email);
}
function $wR(T) {
  if (T.name === "gpt-5-codex") return "gpt-5-codex";
  if (T.name.includes("kimi-k2")) return "kimi";
  if (T.provider === "openai") return "gpt";
  if (T.provider === "xai") return "xai";
  if (T.provider === "vertexai") return "gemini";
  return "default";
}