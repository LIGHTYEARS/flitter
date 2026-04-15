function ya(T) {
  let R = n8[T];
  return `${R.provider}/${R.name}`;
}
function RO(T) {
  let R = T.indexOf("/");
  if (R === -1) throw Error(`Invalid provider/model format: ${T}`);
  return {
    provider: T.slice(0, R),
    model: T.slice(R + 1)
  };
}
function oN(T) {
  switch (T) {
    case "anthropic":
      return n8.CLAUDE_SONNET_4_5;
    case "openai":
      return n8.GPT_5_4;
    case "xai":
      return n8.GROK_CODE_FAST_1;
    case "cerebras":
      return n8.Z_AI_GLM_4_7;
    case "fireworks":
      return n8.FIREWORKS_GLM_4P6;
    case "baseten":
      return n8.BASETEN_KIMI_K2P5;
    case "moonshotai":
      return n8.KIMI_K2_INSTRUCT;
    case "openrouter":
      return n8.SONOMA_SKY_ALPHA;
    case "groq":
      return n8.GPT_OSS_120B;
    case "vertexai":
      return n8.GEMINI_3_1_PRO_PREVIEW;
    default:
      throw Error(`Unknown provider: ${T}`);
  }
}