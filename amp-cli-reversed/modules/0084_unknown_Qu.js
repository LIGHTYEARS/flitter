async function Qu(T, R, a, e) {
  try {
    return (await T.messages.countTokens({
      model: R,
      messages: e.messages ?? [{
        role: "user",
        content: "x"
      }],
      ...(e.tools && e.tools.length > 0 ? {
        tools: e.tools
      } : {}),
      ...(e.system && e.system.length > 0 ? {
        system: e.system
      } : {}),
      thinking: {
        type: "enabled",
        budget_tokens: 1e4
      }
    }, {
      headers: a
    })).input_tokens;
  } catch (t) {
    J.warn("countTokens failed, falling back to estimate", {
      error: t
    });
    let r = JSON.stringify(e.messages ?? []),
      h = JSON.stringify(e.tools ?? []),
      i = JSON.stringify(e.system ?? []);
    return n1R(r + h + i);
  }
}