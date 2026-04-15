function y7R(T, R) {
  if (!T) return {
    action: null
  };
  T = LWT(T);
  for (let a of T) {
    if (a.if === !1) continue;
    if (a.on.event === "tool:post-execute") {
      if (!(Array.isArray(a.on.tool) ? a.on.tool : [a.on.tool]).includes(R.toolUse.name)) continue;
      if (J.debug(`Post-execution hook triggered: ${a.id}`, {
        hookID: a.id,
        threadID: R.threadID,
        toolName: R.toolUse.name,
        toolUseID: R.toolUse.id,
        action: a.action
      }), a.action.type === "redact-tool-input") return {
        hookID: a.id,
        action: a.action
      };
    }
  }
  return {
    action: null
  };
}