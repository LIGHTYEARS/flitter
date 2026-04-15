function grT(T, R) {
  let a = [],
    e = new Set();
  if (R?.includeSubagentMessages) for (let [h] of T.messages.entries()) e.add(h);else for (let [h, i] of T.messages.entries()) if (!i.parentToolUseId) e.add(h);
  let t = new Map(),
    r = new Set();
  for (let [h, i] of T.messages.entries()) {
    if (!e.has(h)) continue;
    let c = `${i.role}-${h}`;
    switch (i.role) {
      case "assistant":
        {
          let s = i.state.type === "streaming";
          for (let A of i.content) if (A.type === "tool_use") {
            if (t.set(A.id, A), s) r.add(A.id);
          }
          if (i.content.some(A => A.type === "text" && A.text.trim() || A.type === "thinking" && Xm(A))) a.push({
            type: "message",
            id: c,
            message: i
          });
          for (let A of i.content) {
            if (A.type !== "tool_use") continue;
            let l = !1;
            for (let o = h + 1; o < T.messages.length; o++) {
              if (!e.has(o)) continue;
              let n = T.messages[o];
              if (!n) continue;
              for (let p of n.content) if (p.type === "tool_result" && p.toolUseID === A.id) {
                l = !0;
                break;
              }
              if (l) break;
            }
            if (l) continue;
            a.push({
              type: "toolResult",
              id: A.id,
              toolUse: A,
              toolResult: {
                type: "tool_result",
                toolUseID: A.id,
                run: {
                  status: "in-progress"
                }
              }
            });
          }
          break;
        }
      case "info":
        {
          if (i.content.some(s => s.type === "manual_bash_invocation" || s.type === "summary" && s.summary.type === "message")) a.push({
            type: "message",
            id: c,
            message: i
          });
          break;
        }
      case "user":
        {
          let s = i.content.some(A => A.type === "text" && A.text.trim() || A.type === "image");
          for (let A of i.content) if (A.type === "tool_result") {
            let l = t.get(A.toolUseID) ?? Tn(T, A.toolUseID);
            if (!l) throw Error(`(bug) tool use ${A.toolUseID} not found`);
            a.push({
              type: "toolResult",
              id: A.toolUseID,
              toolUse: l,
              toolResult: A
            });
          }
          if (s) a.push({
            type: "message",
            id: c,
            message: i
          });
          break;
        }
    }
  }
  return {
    items: a
  };
}