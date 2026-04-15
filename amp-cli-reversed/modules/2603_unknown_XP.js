function xJT(T, R) {
  if (R === void 0) return T;
  let a = T.split(`
`);
  return a.splice(R, 1), a.join(`
`).trim();
}
function kM0(T) {
  let R = tf(T),
    a = IrT(R);
  return xJT(R, a.lineIndex);
}
function XP() {
  return {
    viewState: {
      state: "initial",
      interactionState: !1,
      toolState: {
        running: 0,
        blocked: 0
      }
    },
    subagentContentByParentID: {},
    items: [],
    todosList: [],
    mainThread: null
  };
}