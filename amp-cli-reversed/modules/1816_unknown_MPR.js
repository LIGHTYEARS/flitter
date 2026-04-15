function LPR(T) {
  if (T.status === "done") return typeof T.result === "string" ? T.result : JSON.stringify(T.result);
  return;
}
function $DT(T, R, a) {
  let e = T[R];
  if (!e) return Promise.reject(Error(`No handler for plugin request method: ${R}`));
  return e(a);
}
function MPR(T) {
  if (T.role === "user") {
    let a = [];
    for (let e of T.content) if (e.type === "text") a.push({
      type: "text",
      text: e.text
    });else if (e.type === "tool_result") {
      let t = e,
        r = {
          type: "tool_result",
          toolUseID: t.toolUseID,
          output: LPR(t.run),
          status: CPR(t.run.status)
        };
      a.push(r);
    }
    return {
      role: "user",
      id: T.messageId,
      content: a
    };
  }
  if (T.role === "assistant") {
    let a = [];
    for (let e of T.content) if (e.type === "text") a.push({
      type: "text",
      text: e.text
    });else if (e.type === "thinking") a.push({
      type: "thinking",
      thinking: e.thinking
    });else if (e.type === "tool_use") {
      let t = e,
        r = {
          type: "tool_use",
          id: t.id,
          name: t.name,
          input: t.input
        };
      a.push(r);
    }
    return {
      role: "assistant",
      id: T.messageId,
      content: a
    };
  }
  let R = [];
  for (let a of T.content) if (a.type === "text") R.push({
    type: "text",
    text: a.text
  });
  return {
    role: "info",
    id: T.messageId,
    content: R
  };
}