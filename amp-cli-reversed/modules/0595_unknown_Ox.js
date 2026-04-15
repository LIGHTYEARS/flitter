function HfR(T, R, a) {
  if (!T.meta?.traces) return;
  let e = T.meta.traces.find(t => t.id === R);
  if (!e) return;
  if (!e.events) e.events = [];
  e.events.push(a);
}
function WfR(T, R, a) {
  if (!T.meta?.traces) return;
  let e = T.meta.traces.find(t => t.id === R);
  if (!e) return;
  e.attributes = {
    ...e.attributes,
    ...a
  };
}
function u8T(T) {
  try {
    return j2(T.replace(/\\+$/, "") + '"');
  } catch {
    return j2(T);
  }
}
function Ox(T) {
  let R = [];
  if (T.currentlyVisibleFiles) {
    if (T.currentlyVisibleFiles.length > 0) R.push(`Currently visible files user has open: ${T.currentlyVisibleFiles.map(Kt).join(", ")}`);
  }
  if (T.runningTerminalCommands && T.runningTerminalCommands.length > 0) R.push(`Currently running terminal commands:
  ${T.runningTerminalCommands.join(`
 `)}`);
  if (T.activeEditor) R.push(`Currently active editor: ${Kt(T.activeEditor)}`);
  if (T.activeEditor && !I9T(T.activeEditor)) {
    if (T.selectionRange) R.push(`Selection range: ${T.selectionRange.start.line}:${T.selectionRange.start.column}-${T.selectionRange.end.line}:${T.selectionRange.end.column}`);else if (T.cursorLocation) {
      if (R.push(`Current cursor location: ${T.cursorLocation.line}:${T.cursorLocation.column}`), T.cursorLocationLine) R.push(`Contents of line on which cursor is: \`${T.cursorLocationLine}\``);
    }
  }
  if (T.snapshotOIDs && T.snapshotOIDs.length > 0) for (let a of T.snapshotOIDs) R.push(`Git tree snapshot: ${a.treeOID} (repo: ${a.repoRoot})`);
  if (T.aggmanContext) {
    let a = T.aggmanContext;
    if (R.push(`Current URL the user is on: ${a.currentURL}`), a.recentUnreadThreads && a.recentUnreadThreads.length > 0) {
      let e = a.recentUnreadThreads.map(t => {
        let r = t.projectName?.trim();
        return r ? `- ${t.title} [${r}] (${t.threadID})` : `- ${t.title} (${t.threadID})`;
      });
      R.push(`Recent unread threads by the user (most recent first):
${e.join(`
`)}`);
    }
  }
  return `# User State
${R.join(`
`)}

`;
}