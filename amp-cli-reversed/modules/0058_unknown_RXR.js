function YVR(T) {
  return T.length > ayT ? T.slice(0, ayT) + `

[Content truncated at 256KB for context window]` : T;
}
function RXR(T) {
  return {
    runInference: async (R, a, e, t, r, h, i) => {
      let c = await eLR(e, t, a, r, Xt(R), h, i, void 0, void 0, T),
        s = c.message,
        A = [],
        l = s.choices[0];
      if (l?.message?.tool_calls) {
        for (let n of l.message.tool_calls) if (n.id) {
          let p = n;
          A.push({
            id: n.id,
            name: p.function?.name ?? "",
            input: p.function?.arguments ? JSON.parse(p.function.arguments) : void 0
          });
        }
      }
      let o;
      if (s.usage) {
        let n = s.usage,
          p = n.prompt_tokens_details?.cached_tokens ?? n.cached_tokens ?? 0;
        o = {
          model: Xt(R),
          maxInputTokens: 0,
          inputTokens: 0,
          outputTokens: n.completion_tokens,
          cacheReadInputTokens: p,
          cacheCreationInputTokens: n.prompt_tokens - p,
          totalInputTokens: n.prompt_tokens,
          timestamp: new Date().toISOString()
        };
      }
      return {
        result: c,
        toolUses: A,
        debugUsage: o
      };
    },
    extractMessage: R => {
      return R.message.choices[0]?.message?.content || void 0;
    },
    updateConversation: (R, a, e) => {
      let t = a.message.choices[0];
      if (t?.message) {
        let r = t.message,
          h = {
            role: "assistant",
            content: r.content || "",
            reasoning_content: r.reasoning_content?.length ? r.reasoning_content : void 0,
            tool_calls: r.tool_calls
          };
        R.push(h);
      }
      for (let {
        id: r,
        result: h
      } of e) {
        let i = {
          role: "tool",
          content: aXR(h),
          tool_call_id: r
        };
        R.push(i);
      }
    }
  };
}