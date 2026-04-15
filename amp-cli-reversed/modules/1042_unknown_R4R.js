function T4R(T) {
  let R = ["none", "minimal", "low", "medium", "high", "xhigh"];
  if (!T) return "medium";
  return R.includes(T) ? T : "medium";
}
async function R4R({
  model: T,
  thread: R,
  systemPrompt: a,
  tools: e,
  reasoningEffort: t,
  serviceTier: r
}) {
  let h = e,
    i = P3T(R),
    c = E0T(T) ?? oN(P9.OPENAI),
    s = "auto",
    A = [{
      role: "system",
      content: a.map(p => p.text).join(`

`)
    }, ...O8(i)],
    l = c.maxOutputTokens,
    o = c.capabilities?.reasoning ?? !0,
    n = {
      model: T,
      input: A,
      store: !1,
      include: ["reasoning.encrypted_content"],
      tools: h.map(k3T),
      stream: !0,
      max_output_tokens: l,
      prompt_cache_key: R.id,
      parallel_tool_calls: !0,
      stream_options: {
        include_obfuscation: !1
      },
      ...(o ? {
        reasoning: {
          effort: T4R(t),
          summary: "auto"
        }
      } : {
        temperature: 0.1
      })
    };
  if (r) {
    let p = n;
    p.service_tier = r;
  }
  return n;
}