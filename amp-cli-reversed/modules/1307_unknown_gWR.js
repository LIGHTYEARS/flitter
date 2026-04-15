function gWR(T) {
  let R = new Map(),
    a = [];
  for (let e of T) {
    if (e.role === "assistant") {
      for (let t of e.content) if (t.type === "tool_use") R.set(t.id, {
        toolUseID: t.id,
        tool: t.name,
        input: t.input
      });
    }
    if (e.role === "user") for (let t of e.content) {
      if (t.type !== "tool_result") continue;
      let r = {
        status: IWR(t.status)
      };
      if (wt(r.status)) {
        let h = R.get(t.toolUseID);
        if (h) {
          let i = {
            toolUseID: t.toolUseID,
            tool: h.tool,
            input: h.input,
            status: r.status === "rejected-by-user" ? "cancelled" : r.status,
            ...(t.output !== void 0 ? {
              output: t.output
            } : {}),
            ...(t.status === "error" && typeof t.output === "string" ? {
              error: t.output
            } : {})
          };
          a.push({
            call: h,
            result: i
          });
        }
      }
    }
  }
  return a;
}