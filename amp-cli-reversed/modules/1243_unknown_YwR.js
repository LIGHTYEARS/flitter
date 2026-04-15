function YwR(T, R) {
  let a = dt(T, "assistant");
  if (!a) return {
    updatedThread: T,
    uninvoked: []
  };
  let e = a.content.filter(r => r.type === "tool_use"),
    t = R.items.filter(r => !R.wasInvoked(e, r));
  if (t.length === 0) return {
    updatedThread: T,
    uninvoked: []
  };
  return {
    updatedThread: Lt(T, r => {
      let h = r.messages.findLast(i => i.role === "assistant");
      if (h && h.role === "assistant") {
        for (let i of t) {
          let c = fx();
          h.content.push({
            type: "tool_use",
            complete: !0,
            id: c,
            name: R.toolName,
            input: R.toToolInput(i)
          });
        }
        if (h.state.type === "complete" && h.state.stopReason === "end_turn") h.state = {
          ...h.state,
          stopReason: "tool_use"
        };
      }
      r.v++;
    }),
    uninvoked: t
  };
}