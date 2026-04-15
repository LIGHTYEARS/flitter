function f3T(T, R) {
  let a = T && R?.state === "active" && R.inferenceState !== "running" ? E4R(T) : {
      running: 0,
      blocked: 0
    },
    e = R?.state === "active" ? R.handoff : void 0;
  return {
    ...R,
    interactionState: T && R?.state === "active" ? IUT(T, R.inferenceState, e) : !1,
    toolState: a
  };
}