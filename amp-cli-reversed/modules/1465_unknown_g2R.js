function g2R(T) {
  return {
    runInference: async (R, a, e, t, r, h, i) => {
      let c = await yWT(e, t, a, r, Xt(R), T, h, i, void 0),
        s = c.message,
        A = mWT(s),
        l;
      if ("usage" in s && s.usage) {
        let o = s.usage;
        l = {
          model: Xt(R),
          maxInputTokens: 0,
          inputTokens: o.prompt_tokens ?? 0,
          outputTokens: o.completion_tokens ?? 0,
          cacheCreationInputTokens: null,
          cacheReadInputTokens: null,
          totalInputTokens: o.prompt_tokens ?? 0,
          timestamp: new Date().toISOString()
        };
      }
      return {
        result: c,
        toolUses: A,
        debugUsage: l
      };
    },
    extractMessage: R => {
      let a = R.message;
      if ("error" in a) throw Error(`Cerebras error: ${a.error}`);
      if ("object" in a && a.object === "chat.completion") return a.choices[0]?.message?.content || void 0;
      if ("object" in a && a.object === "chat.completion.chunk") return a.choices?.[0]?.delta?.content || void 0;
      return;
    },
    updateConversation: (R, a, e) => {
      let t = a.message,
        r = uWT(t);
      if (r) R.push(r);
      for (let {
        id: h,
        result: i
      } of e) {
        let c = {
          role: "tool",
          content: $2R(i),
          tool_call_id: h
        };
        R.push(c);
      }
    }
  };
}