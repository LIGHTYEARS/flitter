async function c4R(T) {
  let {
      thread: R,
      userPromptText: a,
      systemPrompt: e,
      images: t,
      toolSpec: r,
      configService: h,
      signal: i,
      modelOverride: c,
      serviceAuthToken: s
    } = T,
    A = await h.getLatest(i),
    {
      model: l,
      agentMode: o
    } = pn(A.settings, R),
    n = c ?? l,
    [p] = n.split("/"),
    _ = Xt(n);
  J.debug("Running tool with model", {
    threadId: R.id,
    model: n,
    provider: p,
    modelName: _,
    toolName: r.name
  });
  let m = L7T(R);
  switch (p) {
    case "anthropic":
      return o4R(m, a, t, e, r, _, o, h, i, s);
    case "xai":
      return l4R(m, a, e, r, _, o, h, i, s);
    case "openai":
      return n4R(m, a, t, e, r, _, o, h, i, s);
    case "vertexai":
      return s4R(m, a, t, e, r, _, o, h, i, s);
    case "openrouter":
    case "groq":
    case "moonshotai":
    case "cerebras":
    default:
      throw Error(`Unsupported provider for handoff: ${p}`);
  }
}