async function o4R(T, R, a, e, t, r, h, i, c, s) {
  let A = P8T(s),
    l = await ep({
      configService: i
    }, c, A ? {
      defaultHeaders: A
    } : void 0),
    o = k8T(T),
    n = [{
      type: "text",
      text: R
    }];
  for (let y of a) if (y.source.type === "base64" && "mediaType" in y.source && "data" in y.source) n.push({
    type: "image",
    source: {
      type: "base64",
      media_type: y.source.mediaType,
      data: y.source.data
    }
  });
  let p = [...o, {
      role: "user",
      content: n
    }],
    _ = await i.getLatest(c),
    m = await l.messages.create({
      model: r,
      max_tokens: 4096,
      system: e,
      messages: p,
      tools: kO([t]),
      tool_choice: {
        type: "tool",
        name: t.name
      }
    }, {
      signal: c,
      headers: {
        ...JN(_.settings, {
          id: T.id,
          agentMode: h
        }, r),
        ...(A ?? {})
      }
    }),
    b = m.content.find(y => y.type === "tool_use" && y.name === t.name);
  if (!b) throw Error(`Expected tool call for ${t.name} but none found`);
  return {
    toolCall: b.input,
    "~debugUsage": {
      model: r,
      maxInputTokens: TU(r, {
        enableLargeContext: x8T(h, r)
      }),
      inputTokens: m.usage.input_tokens,
      outputTokens: m.usage.output_tokens,
      cacheCreationInputTokens: m.usage.cache_creation_input_tokens ?? null,
      cacheReadInputTokens: m.usage.cache_read_input_tokens ?? null,
      totalInputTokens: m.usage.input_tokens,
      timestamp: new Date().toISOString()
    }
  };
}