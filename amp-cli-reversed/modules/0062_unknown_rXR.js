function rXR(T) {
  let {
    model: R,
    agentMode: a
  } = pn(T.config.settings, T.thread);
  if (a === "deep") return {
    model: n8.CLAUDE_OPUS_4_6.name,
    provider: P9.ANTHROPIC
  };
  let {
    provider: e
  } = RO(R);
  return {
    model: R,
    provider: e
  };
}