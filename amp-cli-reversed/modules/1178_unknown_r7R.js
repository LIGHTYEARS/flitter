function r7R(T, R) {
  if (T === "openai" && R?.includes("gpt-oss-120b")) return new gX();
  switch (T) {
    case "vertexai":
      return new tNT();
    case "openai":
      return new _UT();
    case "openrouter":
      return new fWT();
    case "anthropic":
      return new OwT();
    case "xai":
      return new kUT();
    case "cerebras":
      return new kWT();
    case "fireworks":
      return new CUT();
    case "baseten":
      return new LUT();
    case "groq":
      return new gX();
    case "moonshotai":
      return new xWT();
    default:
      throw Error("Unknown provider: " + T);
  }
}