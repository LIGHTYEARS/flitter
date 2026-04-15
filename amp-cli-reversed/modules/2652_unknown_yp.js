function zD0(T) {
  let R = drT.get(T);
  if (R) return R;
  return qJT.find(a => a.name === T) ?? WJT;
}
function KIT() {
  return [...qJT, ...drT.values()];
}
function yp(T, R) {
  return new yS({
    toolRunning: T.primary,
    toolSuccess: T.success,
    toolError: T.destructive,
    toolCancelled: T.warning,
    toolName: T.foreground,
    userMessage: T.secondary,
    assistantMessage: T.foreground,
    systemMessage: T.mutedForeground,
    codeBlock: T.foreground,
    inlineCode: T.warning,
    syntaxHighlight: R.syntaxHighlight,
    fileReference: T.secondary,
    processing: T.primary,
    waiting: T.warning,
    completed: T.success,
    cancelled: T.mutedForeground,
    suggestion: T.accent,
    command: T.warning,
    filename: T.secondary,
    keybind: T.primary,
    button: T.secondary,
    link: T.primary,
    shellMode: T.primary,
    shellModeHidden: T.mutedForeground,
    handoffMode: T.accent,
    handoffModeDim: FD0(T.accent, 0.6),
    queueMode: T.mutedForeground,
    diffAdded: T.success,
    diffRemoved: T.destructive,
    diffChanged: T.warning,
    diffContext: T.mutedForeground,
    ideConnected: T.success,
    ideDisconnected: T.destructive,
    ideWarning: T.warning,
    scrollbarThumb: T.foreground,
    scrollbarTrack: T.mutedForeground,
    tableBorder: T.tableBorder,
    selectionBackground: T.warning,
    selectionForeground: T.background,
    selectedMessage: T.success,
    recommendation: T.primary,
    smartModeColor: VIT("smart", R),
    rushModeColor: VIT("rush", R),
    threadGraphNode: T.primary,
    threadGraphNodeSelected: T.warning,
    threadGraphConnector: T.foreground
  });
}