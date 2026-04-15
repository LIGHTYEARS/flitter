function L50(T) {
  if (T instanceof zm) return T.getClipRegion();
  return null;
}
function gB(T) {
  let R = [];
  for (let i of T.tools) R.push(new Bs({
    toolUse: i.toolUse,
    toolRun: i.toolRun,
    toolProgress: i.toolProgress
  }));
  if (!T.terminalAssistantMessage) return R;
  let a = T.terminalAssistantMessage,
    e = a.state.type === "cancelled",
    t = "",
    r = -1;
  for (let i = a.content.length - 1; i >= 0; i--) if (a.content[i]?.type === "thinking") {
    r = i;
    break;
  }
  let h = () => {
    if (t.trim().length === 0) {
      t = "";
      return;
    }
    R.push(new Z3({
      markdown: t
    })), t = "";
  };
  for (let [i, c] of a.content.entries()) {
    if (c.type === "text") {
      t += c.text;
      continue;
    }
    if (c.type !== "thinking" || e) continue;
    h(), R.push(new Rd({
      thinkingBlock: c,
      isStreaming: a.state.type === "streaming" && i === r,
      isCancelled: e && i === r
    }));
  }
  return h(), R;
}