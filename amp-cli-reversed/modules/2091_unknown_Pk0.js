function yk0(T) {
  let R = KxT(T.dtwMessageID);
  if (R) return R;
  let a = T.messageId;
  if (typeof a === "string") {
    let e = KxT(a);
    if (e) return e;
  }
  return Vb();
}
function KxT(T) {
  if (!T) return null;
  let R = z9.safeParse(T);
  return R.success ? R.data : null;
}
function Pk0(T) {
  if (!T) return;
  return {
    ...T,
    currentlyVisibleFiles: [...T.currentlyVisibleFiles],
    runningTerminalCommands: T.runningTerminalCommands ? [...T.runningTerminalCommands] : void 0,
    snapshotOIDs: T.snapshotOIDs ? T.snapshotOIDs.map(R => ({
      ...R
    })) : void 0,
    aggmanContext: T.aggmanContext ? {
      ...T.aggmanContext,
      availableProjects: T.aggmanContext.availableProjects ? T.aggmanContext.availableProjects.map(R => ({
        ...R
      })) : void 0,
      recentUnreadThreads: T.aggmanContext.recentUnreadThreads ? T.aggmanContext.recentUnreadThreads.map(R => ({
        ...R
      })) : void 0
    } : void 0
  };
}