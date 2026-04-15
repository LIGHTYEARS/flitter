function $rT(T) {
  let R = T.toolProgressByToolUseID$.pipe(JR(uJT)),
    a = () => T.getCurrentThread?.(),
    e = () => a()?.title,
    t = () => a()?.agentMode,
    r = () => a()?.messages ?? [],
    h = () => a()?.queuedMessages ?? [],
    i = () => a()?.env?.initial.trees?.[0]?.uri,
    c = () => {
      let n = a();
      if (!n?.autoSubmitDraft) return !1;
      return ve({
        messages: n.messages
      }) === 0;
    },
    s = () => {
      let n = a();
      if (!n) return;
      if (ve({
        messages: n.messages
      }) > 0) return;
      return zET(n, "handoff")?.threadID;
    },
    A = () => ve({
      messages: r()
    }) === 0,
    l = () => {
      let n = r().at(-1);
      return n?.role === "assistant" && n.state.type === "streaming";
    },
    o = v3(T.thread$, T.threadViewState$).pipe(JR(([n, p]) => lB({
      thread: n,
      viewState: p,
      resolvedTokenUsage: T.getResolvedTokenUsage?.()
    })));
  return {
    get thread$() {
      return T.thread$;
    },
    get threadState$() {
      return o;
    },
    get threadViewState$() {
      return T.threadViewState$;
    },
    get inferenceErrors$() {
      return T.inferenceErrors$;
    },
    get toolProgressByToolUseID$() {
      return R;
    },
    get pendingApprovals$() {
      return T.pendingApprovals$;
    },
    get pendingSkills$() {
      return T.pendingSkills$;
    },
    get getCurrentThread() {
      return T.getCurrentThread;
    },
    get getResolvedTokenUsage() {
      return T.getResolvedTokenUsage;
    },
    getThreadID() {
      return a()?.id;
    },
    getThreadTitle() {
      return e();
    },
    getAgentMode() {
      return t();
    },
    getMessages() {
      return r();
    },
    getQueuedMessages() {
      return h();
    },
    getInitialTreeURI() {
      return i();
    },
    shouldAutoSubmitDraft() {
      return c();
    },
    getEmptyHandoffParentThreadID() {
      return s();
    },
    isThreadEmpty() {
      return A();
    },
    isStreaming() {
      return l();
    },
    sendMessage: T.sendMessage,
    restoreTo: T.restoreTo,
    queueMessage: T.queueMessage,
    discardQueuedMessages: T.discardQueuedMessages,
    interruptQueuedMessage: T.interruptQueuedMessage,
    setTitle: T.setTitle,
    setVisibility: T.setVisibility,
    cancelTurn: T.cancelTurn,
    cancelStreaming: T.cancelStreaming,
    retryTurn: T.retryTurn,
    dismissEphemeralError: T.dismissEphemeralError,
    preExecuteMode: T.preExecuteMode,
    postExecuteMode: T.postExecuteMode,
    setTestEphemeralError: T.setTestEphemeralError,
    resolveApproval: T.resolveApproval,
    addPendingSkill: T.addPendingSkill,
    removePendingSkill: T.removePendingSkill,
    clearPendingSkills: T.clearPendingSkills,
    getDraft: T.getDraft,
    setDraft: T.setDraft,
    getFilesAffectedByTruncation: T.getFilesAffectedByTruncation,
    clearPendingNavigation: T.clearPendingNavigation,
    getGuidanceFiles: T.getGuidanceFiles,
    invokeBashTool: T.invokeBashTool
  };
}