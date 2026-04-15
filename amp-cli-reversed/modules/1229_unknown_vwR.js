function vwR(T, R) {
  if (T.includes("gpt-5-codex")) return "gpt-5-codex";
  if (T.includes("kimi-k2")) return "kimi";
  if (T.includes("gpt")) return "gpt";
  if (R === "xai") return "xai";
  if (R === "vertexai") return "gemini";
  return "default";
}