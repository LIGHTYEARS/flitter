function DFR(T) {
  let R = [];
  for (let a of T ?? []) for (let e of a.activeTools.values()) R.push(e);
  return R;
}
function wFR(T) {
  let {
      mainAgentStatus: R,
      checkRuns: a,
      workingDir: e
    } = T,
    t = {};
  for (let {
    check: s,
    status: A
  } of a) if (A.status === "done") t[s.uri] = {
    status: "done",
    result: MFR(s, A.message, e ?? "")
  };else if (A.status === "error") t[s.uri] = {
    status: "error",
    error: A.message
  };else {
    let l = A.turns?.at(-1);
    t[s.uri] = {
      status: "in-progress",
      message: l?.message ?? "Running check..."
    };
  }
  let r = Object.values(t).every(s => s.status === "done" || s.status === "error"),
    h = DFR(R.turns),
    i = R.status === "done" ? {
      main: {
        status: "done",
        review: LFR(R.message),
        toolUses: h
      },
      checks: t
    } : {
      main: {
        status: "in-progress",
        toolUses: h
      },
      checks: t
    },
    c = (R.turns ?? []).map(s => ({
      message: s.message,
      reasoning: s.reasoning,
      isThinking: s.isThinking,
      tool_uses: [...s.activeTools.values()]
    }));
  switch (R.status) {
    case "in-progress":
    case "done":
      return {
        status: R.status === "done" && r ? "done" : "in-progress",
        result: i,
        progress: c,
        "~debug": {
          mainAgent: R["~debug"],
          checks: a.map(s => s.status["~debug"])
        }
      };
    case "error":
      return {
        status: "error",
        error: {
          message: R.message
        }
      };
    case "cancelled":
      return {
        status: "cancelled",
        reason: "Code review was cancelled"
      };
  }
}