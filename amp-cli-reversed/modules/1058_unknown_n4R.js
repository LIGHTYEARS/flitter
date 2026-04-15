async function n4R(T, R, a, e, t, r, h, i, c, s) {
  let A = Js(s),
    l = await uU({
      configService: i
    }, c, A ? {
      defaultHeaders: A
    } : void 0),
    o = P3T(T),
    n = [{
      type: "input_text",
      text: R
    }];
  for (let x of a) if (x.source.type === "base64" && "mediaType" in x.source && "data" in x.source) n.push({
    type: "input_image",
    detail: "auto",
    image_url: `data:${x.source.mediaType};base64,${x.source.data}`
  });
  let p = [{
      role: "system",
      content: e
    }, ...o, {
      role: "user",
      content: n
    }],
    _ = {
      ...t.inputSchema,
      additionalProperties: !1
    },
    m = await l.responses.create({
      model: r,
      input: p,
      text: {
        format: {
          type: "json_schema",
          name: t.name,
          strict: !0,
          schema: _
        }
      },
      store: !1
    }, {
      signal: c,
      headers: {
        ...m3T({
          id: T.id,
          agentMode: h
        }, void 0),
        ...(A ?? {})
      }
    }),
    b = m.output?.find(x => x.type === "message");
  if (!b || b.type !== "message") throw Error("Expected message output but none found");
  let y = b.content?.find(x => x.type === "output_text");
  if (!y || y.type !== "output_text") throw Error("Expected output_text content in response");
  let u;
  try {
    u = JSON.parse(y.text);
  } catch (x) {
    let f = y.text?.slice?.(0, 200) ?? "";
    throw Error(`Response was not valid JSON for ${t.name} (preview: ${f}...)`);
  }
  let P = m.usage?.input_tokens_details?.cached_tokens ?? 0,
    k = (m.usage?.input_tokens ?? 0) - P;
  return {
    toolCall: u,
    "~debugUsage": {
      model: r,
      maxInputTokens: Ys(`openai/${r}`),
      inputTokens: m.usage?.input_tokens ?? 0,
      outputTokens: m.usage?.output_tokens ?? 0,
      cacheCreationInputTokens: k,
      cacheReadInputTokens: P,
      totalInputTokens: m.usage?.input_tokens ?? 0,
      timestamp: new Date().toISOString()
    }
  };
}