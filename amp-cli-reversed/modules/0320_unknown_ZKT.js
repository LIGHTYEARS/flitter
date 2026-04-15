function pS(T) {
  return T.toolUseId;
}
function dA0(T) {
  return T.parentToolUseId;
}
function ZKT(T) {
  let R = pS(T);
  return {
    id: T.id || R,
    toolCallId: R,
    toolName: T.toolName,
    args: T.args,
    reason: T.reason,
    toAllow: T.toAllow,
    context: T.context,
    subagentToolName: T.subagentToolName,
    parentToolCallId: dA0(T),
    timestamp: T.timestamp,
    matchedRule: T.matchedRule,
    ruleSource: T.ruleSource
  };
}