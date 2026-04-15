function $zT(T) {
  return {
    runInference: async (R, a, e, t, r, h, i) => {
      let c = await h.configService.getLatest(i),
        s = await gO(Xt(R), e.contents, t, r, c, i, {
          systemInstruction: a,
          tools: V8T(t),
          thinkingConfig: T?.thinkingConfig,
          temperature: T?.temperature
        }),
        A = (s.message.candidates?.[0]?.content?.parts?.filter(l => l.functionCall) ?? []).map(l => {
          let o = l.functionCall;
          return {
            id: o.id ?? `${fx()}__${o.name}`,
            input: o.args ?? {},
            name: o.name ?? ""
          };
        });
      return {
        result: s.message,
        toolUses: A,
        debugUsage: s["~debugUsage"]
      };
    },
    extractMessage: R => {
      let a = (R.candidates?.[0]?.content?.parts ?? []).filter(e => e.text && !e.thought);
      if (a.length === 0) return;
      return a.map(e => e.text ?? "").join("");
    },
    updateConversation: (R, a, e) => {
      let t = a.candidates?.[0]?.content;
      if (!t) return;
      if (R.contents.push({
        role: "model",
        parts: t.parts ?? []
      }), e.length > 0) {
        let r = e.map(({
          id: h,
          result: i
        }) => {
          let [, c] = h.split("__"),
            s = {};
          if (i.status === "done") s.output = i.result;else if (i.status === "error") s.error = i.error?.message ?? "Error executing tool";else s.error = `Tool status: ${i.status}`;
          return {
            functionResponse: {
              name: c ?? "",
              response: s
            }
          };
        });
        R.contents.push({
          role: "user",
          parts: r
        });
      }
    }
  };
}