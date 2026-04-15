async function l4R(T, R, a, e, t, r, h, i, c) {
  let s = x3T(T),
    A = [{
      type: "text",
      text: R
    }],
    l = [...s, {
      role: "user",
      content: A
    }],
    o = Js(c),
    n = await mUT(l, [e], a, {
      id: T.id,
      agentMode: r
    }, t, {
      configService: h
    }, i, void 0, {
      type: "function",
      function: {
        name: e.name
      }
    }, o ? {
      defaultHeaders: o
    } : void 0, o),
    p = n.message?.choices?.[0]?.message?.tool_calls?.[0];
  if (!p || p.function.name !== e.name) throw Error(`Expected tool call for ${e.name} but none found`);
  let _;
  try {
    _ = JSON.parse(p.function.arguments);
  } catch (m) {
    let b = p.function.arguments?.slice?.(0, 200) ?? "";
    throw Error(`Tool call arguments for ${e.name} were not valid JSON (preview: ${b}...)`);
  }
  return {
    toolCall: _,
    "~debugUsage": {
      model: t,
      maxInputTokens: Ys(`xai/${t}`),
      inputTokens: n.message?.usage?.prompt_tokens ?? 0,
      outputTokens: n.message?.usage?.completion_tokens ?? 0,
      cacheCreationInputTokens: null,
      cacheReadInputTokens: null,
      totalInputTokens: n.message?.usage?.prompt_tokens ?? 0,
      timestamp: new Date().toISOString()
    }
  };
}