function BI(T, R, a) {
  if (!R.action) return {
    abortOp: !1
  };
  switch (R.action.type) {
    case "send-user-message":
      {
        let e = {
          type: "user:message",
          message: {
            messageId: 0,
            content: [{
              type: "text",
              text: R.action.message
            }],
            source: {
              type: "hook",
              hook: R.hookID
            }
          }
        };
        return T.updateThread(e), T.onThreadDelta(e), {
          abortOp: !0
        };
      }
    case "redact-tool-input":
      {
        if (!a?.toolUseID) return J.warn("redact-tool-input action requires toolUseID in context"), {
          abortOp: !1
        };
        let e = {
          type: "tool:processed",
          toolUse: a.toolUseID,
          newArgs: R.action.redactedInput
        };
        return T.updateThread(e), T.onThreadDelta(e), J.debug("Tool input redacted", {
          hookID: R.hookID,
          toolUseID: a.toolUseID
        }), {
          abortOp: !1
        };
      }
    case "handoff":
      return J.info("Handoff hook triggered", {
        hookID: R.hookID,
        goal: R.action.goal
      }), T.executeHandoff(R.action.goal), {
        abortOp: !1
      };
  }
}