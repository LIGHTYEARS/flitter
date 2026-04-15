function t7R(T, R, a) {
  let [e, t] = T.includes("/") ? T.split("/", 2) : ["", T],
    r = a ? xi(a)?.reasoningEffort : void 0,
    h = R["agent.deepReasoningEffort"] !== void 0;
  switch (e) {
    case "anthropic":
      return R["anthropic.effort"] ?? r ?? "high";
    case "openai":
      return (t?.includes("codex") && h ? O2(R) : void 0) ?? r ?? "medium";
    case "vertexai":
      return R["gemini.thinkingLevel"] ?? r ?? "medium";
    default:
      return r ?? "medium";
  }
}