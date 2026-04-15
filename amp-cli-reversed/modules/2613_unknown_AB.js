function LM0(T) {
  let R = CM0(T);
  if (R) return R;
  return !1;
}
function AB(T, R, a = {
  files: []
}, e = void 0) {
  let t = EM0(T),
    r = R === "awaiting_approval" ? 1 : 0;
  if (R === "working" || R === "streaming") return {
    state: "active",
    inferenceState: "running",
    fileChanges: a,
    ephemeralError: e,
    interactionState: !1,
    toolState: {
      running: 0,
      blocked: 0
    }
  };
  if (R === "tool_use" || R === "running_tools") {
    let h = t.running;
    return {
      state: "active",
      inferenceState: "idle",
      fileChanges: a,
      ephemeralError: e,
      interactionState: h > 0 ? "tool-running" : !1,
      toolState: {
        running: h,
        blocked: r
      }
    };
  }
  if (R === "awaiting_approval") return {
    state: "active",
    inferenceState: "idle",
    fileChanges: a,
    ephemeralError: e,
    interactionState: "user-tool-approval",
    toolState: {
      running: t.running,
      blocked: r
    }
  };
  return {
    state: "active",
    inferenceState: "idle",
    fileChanges: a,
    ephemeralError: e,
    interactionState: LM0(T),
    toolState: {
      running: t.running,
      blocked: r
    }
  };
}