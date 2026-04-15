async function OJT(T, R, a) {
  await T.validateThreadOwnership?.(R, a);
  let e = (await T.threadService.get(R)) ?? void 0;
  return SJT(T.workerDeps, {
    threadID: R,
    threadMeta: T.switchThreadVisibility ? MA(T.switchThreadVisibility) : void 0,
    agentMode: e ? void 0 : T.switchThreadAgentMode,
    thread: e,
    onFirstAssistantMessage: T.onFirstAssistantMessage
  });
}