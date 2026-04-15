function RhT(T) {
  let R = T.activeThreadHandle.getInitialTreeURI();
  return {
    thread: T.thread,
    ampURL: T.ampURL,
    effectiveAgentMode: T.getEffectiveAgentMode(),
    isProcessing: T.isProcessing,
    threadPoolIsDTW: T.threadPool.isDTWMode?.() === !0,
    transportState: T.threadPool.getTransportConnectionState?.(),
    transportRole: T.threadPool.getTransportConnectionRole?.(),
    threadViewState: T.threadViewStates[T.thread.id],
    initialTreePath: R ? Mr(Ht(R)) : void 0,
    currentWorkspacePath: Mr(Ht(T.currentWorkspace)),
    clientId: T.clientId,
    logFile: T.logFile,
    pid: process.pid
  };
}