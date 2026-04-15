function cRR(T, R) {
  let a = GN0(R);
  if (T >= a.danger) return "danger";else if (T >= a.warning) return "warning";else if (T >= a.recommendation) return "recommendation";
  return !1;
}
function KN0(T) {
  let R = T.totalInputTokens / T.maxInputTokens;
  return cRR(R, T.maxInputTokens);
}
function XN0(T) {
  return T.padEnd(VN0);
}
function yB(T) {
  let {
    threadViewState: R,
    tokenUsage: a,
    compactionState: e,
    submittingPromptMessage: t,
    waitingForConfirmation: r,
    showingEphemeralError: h,
    executingCommand: i,
    executingCommandNoun: c,
    executingCommandVerb: s,
    executingCommandMessage: A,
    runningBashInvocations: l
  } = T;
  if (i) {
    if (A) return {
      type: "executing-message",
      message: A
    };
    return {
      type: "executing",
      noun: c,
      verb: s,
      command: i
    };
  }
  if (l) return {
    type: "simple",
    message: "Running shell command..."
  };
  if (e === "compacting") return {
    type: "simple",
    message: "Auto-compacting..."
  };
  if (t) return {
    type: "simple",
    message: "Submitting message..."
  };
  if (!R || R.state !== "active") return {
    type: "none"
  };
  if (r || R.interactionState === "user-tool-approval") return {
    type: "simple",
    message: "Waiting for approval..."
  };
  if (R.interactionState === "handoff") return {
    type: "simple",
    message: "Handing off to new thread..."
  };
  if (R.interactionState === "tool-running") {
    let n = R.toolState.running;
    if (n > 1) return {
      type: "simple",
      message: `Running ${n} tools...`
    };
    return {
      type: "simple",
      message: "Running tools..."
    };
  }
  if (R.inferenceState === "retrying") return {
    type: "simple",
    message: "Stream interrupted, retrying..."
  };
  if (R.inferenceState === "running") {
    if (!T.hasStartedStreamingResponse) return {
      type: "simple",
      message: "Waiting for response..."
    };
    if (T.runningBashInvocations) return {
      type: "simple",
      message: "Running tools..."
    };
    return {
      type: "simple",
      message: "Streaming response..."
    };
  }
  if (R.inferenceState === "cancelled") return {
    type: "simple",
    message: "Cancelled",
    italic: !0
  };
  let o = T.threadAgentMode ? qt(T.threadAgentMode) : !1;
  if (a && !h && !o) {
    if (qo(T.threadAgentMode)) return {
      type: "none"
    };
    let n = KN0(a);
    if (n === "recommendation") return {
      type: "context-warning",
      prefix: "Optimize context.",
      threshold: n
    };
    if (n === "warning") return {
      type: "context-warning",
      prefix: "High context usage.",
      threshold: n
    };
    if (n === "danger") return {
      type: "context-warning",
      prefix: "Context near full.",
      threshold: n
    };
  }
  return {
    type: "none"
  };
}