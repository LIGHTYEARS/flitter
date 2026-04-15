function lC(T) {
  let R = O8(dt(T, "assistant"));
  if (!R) return;
  let a = !1;
  if (R.state.type === "streaming") R.state = {
    type: "cancelled"
  }, a = !0;else if (R.state.type === "complete") {
    if (R.content.some(h => h.type === "tool_use" && !Va(h))) R.state = {
      type: "cancelled"
    }, a = !0;
  }
  let e = sA(T),
    t = R.content.some(h => h.type === "tool_use" && !e.has(h.id));
  if (!a && !t) return;
  let r = [];
  for (let h = 0; h < R.content.length; h++) {
    let i = R.content[h];
    if (i?.type !== "tool_use") continue;
    if (!Va(i)) {
      J.debug(`Cleaning up incomplete tool_use ${i.id}`, {
        name: "markPriorStreamingAssistantMessageAsCancelled",
        threadID: T.id,
        blockID: i.id
      });
      let c = {
        type: "tool_use",
        id: i.id,
        name: i.name,
        complete: !0,
        input: i.inputIncomplete ?? i.input ?? {}
      };
      R.content[h] = c;
    }
    if (!e.has(i.id)) r.push(i.id);
  }
  for (let h of r) xwT(T, h, {
    status: "cancelled"
  });
}