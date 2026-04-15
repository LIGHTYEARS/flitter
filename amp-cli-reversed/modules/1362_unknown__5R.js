function _5R(T, R, a) {
  let e = new izT(R);
  function t(r, h) {
    if (!h) return !1;
    if (a && r === a) return !1;
    let i = p5R(r, h.source);
    return e.matches(i);
  }
  return {
    registerTool() {
      throw Error("Tools should not be registered in a filtered tool service");
    },
    invokeTool(r, h, i) {
      if (!e.matches(r)) return new AR(c => {
        c.error(Error(`Tool ${r} is not allowed by this subagent`));
      });
      return T.invokeTool(r, h, i);
    },
    invokeLeasedTool(r, h, i) {
      if (!e.matches(r)) return new AR(c => {
        c.error(Error(`Tool ${r} is not allowed by this subagent`));
      });
      return T.invokeLeasedTool(r, h, i);
    },
    preprocessArgs(r, h, i) {
      return T.preprocessArgs?.(r, h, i);
    },
    tools: T.tools.pipe(JR(r => r.filter(h => t(h.spec.name, h.spec)))),
    getExecutionProfile(r) {
      if (r.startsWith("tb__")) return {
        serial: !1,
        resourceKeys: () => []
      };
      return T.getExecutionProfile(r);
    },
    isToolAllowed(r, h) {
      return e.matches(r);
    },
    getTools(r) {
      return this.tools;
    },
    getToolsForMode(r, h) {
      return this.tools;
    },
    getToolSpec() {
      return;
    },
    normalizeToolName(r) {
      return r;
    },
    normalizeToolArgs(r, h, i) {
      return h;
    },
    pendingApprovals$: T.pendingApprovals$,
    resolveApproval: (...r) => T.resolveApproval(...r),
    clearApprovalsForThread: (...r) => T.clearApprovalsForThread(...r),
    requestApproval: (...r) => T.requestApproval(...r),
    restoreApproval: (...r) => T.restoreApproval(...r),
    dispose() {}
  };
}