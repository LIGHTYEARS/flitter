async function s4R(T, R, a, e, t, r, h, i, c, s) {
  let A = [...rNT(T)],
    l = [{
      text: R
    }];
  for (let m of a) if (m.source.type === "base64" && "mediaType" in m.source && "data" in m.source) l.push({
    inlineData: {
      mimeType: m.source.mediaType,
      data: m.source.data
    }
  });
  let o = A.at(-1);
  if (o?.role === "user") {
    if (!o.parts) o.parts = [];
    o.parts.push(...l);
  } else A.push({
    role: "user",
    parts: l
  });
  let n = await i.getLatest(c),
    p = await gO(r, A, [t], {
      id: T.id,
      agentMode: h
    }, n, c, {
      temperature: 0.1,
      systemInstruction: e,
      toolConfig: {
        functionCallingConfig: {
          mode: NK.ANY
        }
      }
    }, void 0, s),
    _ = p.message.functionCalls?.at(0);
  if (_?.name !== t.name) throw Error(`expected tool args for tool ${t.name}`);
  return {
    toolCall: _.args,
    "~debugUsage": p["~debugUsage"]
  };
}