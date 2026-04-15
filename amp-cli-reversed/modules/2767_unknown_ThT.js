function PB(T, R, a) {
  let e = `select(.pid == ${R})`,
    t = ed(a);
  return `${T === "snapshot" ? `tail -n 10000 ${t}` : `tail -f ${t}`} | jq -C '${e}'`;
}
function ed(T) {
  return T.path ?? Kt(T.uri);
}
function DU0(T, R, a) {
  let e = PB("snapshot", T, R);
  return a ? `${e} | ${a}` : e;
}
function wU0(T, R) {
  return wRR(T, R).map(({
    label: a,
    command: e
  }) => `# ${a}
${e}`).join(`

`);
}
function BQ(T) {
  if (T === void 0 || !Number.isFinite(T) || T <= 0) return "n/a";
  return `${OO(T)} ago (\`${new Date(T).toISOString()}\`)`;
}
function BU0(T) {
  if (!T) return "n/a";
  let R = Date.parse(T);
  if (!Number.isFinite(R)) return `\`${T}\``;
  return BQ(R);
}
function Al(T) {
  if (T === void 0 || T === null) return "n/a";
  return `\`${String(T)}\``;
}
function ThT(T, R = "#") {
  let {
      thread: a,
      threadViewState: e
    } = T,
    t = h => `${R} ${h}`,
    r = [t("Thread"), `- ID: \`${a.id}\``, `- Title: ${BET(a)}`, `- URL: \`${$P(new URL(T.ampURL), a.id).toString()}\``, `- Created: ${BQ(a.created)}`, `- Agent mode: ${Al(a.agentMode)}`, `- Effective mode: \`${T.effectiveAgentMode}\``, `- DTW backed: ${Tm(a) ? "yes" : "no"}`, `- Executor type: ${Al(a.meta?.executorType)}`, `- Messages: \`${a.messages.length}\` total / \`${ve(a)}\` human / \`${a.queuedMessages?.length ?? 0}\` queued`];
  if (a.meta?.status !== void 0) r.push(`- Merge status: ${Al(a.meta.status ?? "null")}`);
  if (a.meta?.lastKnownAgentState) r.push(`- Last known agent state: \`${a.meta.lastKnownAgentState.state}\` at ${BU0(a.meta.lastKnownAgentState.updatedAt)}`);
  if (T.initialTreePath) r.push(`- Initial tree: \`${T.initialTreePath}\``);
  if (T.currentWorkspacePath) r.push(`- Current workspace: \`${T.currentWorkspacePath}\``);
  if (r.push("", t("Runtime"), `- Amp URL: \`${Ob(T.ampURL) ? Lr : T.ampURL}\``, `- Thread pool mode: \`${T.threadPoolIsDTW ? "dtw" : "worker"}\``, `- Connection state: ${Al(T.transportState)}`, `- Connection role: ${Al(T.transportRole)}`, `- Processing: ${T.isProcessing ? "yes" : "no"}`, `- PID: ${Al(T.pid)}`, `- Client ID: ${Al(T.clientId)}`), T.logFile) r.push(`- Log file: \`${ed(T.logFile)}\``);
  if (!e) return r.push("", t("View State"), "- No live thread view state available."), r.join(`
`);
  if (r.push("", t("View State"), `- Worker state: \`${e.state}\``), e.state !== "active") return r.join(`
`);
  if (r.push(`- Inference state: \`${e.inferenceState}\``, `- Interaction state: \`${e.interactionState || "none"}\``, `- Running tools: \`${e.toolState.running}\``, `- Blocked tools: \`${e.toolState.blocked}\``, `- Changed files: \`${e.fileChanges.files.length}\``, `- Turn started: ${BQ(e.turnStartTime)}`, "- Last turn duration: " + (e.turnElapsedMs === void 0 ? "n/a" : M4R(e.turnElapsedMs, {
    approximate: !1
  }))), r.push("", t("Error")), !e.ephemeralError) return r.push("- Ephemeral error: none."), r.join(`
`);
  return r.push(`- Message: ${e.ephemeralError.message}`), r.push(`- Error type: ${Al(e.ephemeralError.error?.type)}`), r.push("- Retry countdown: " + (e.ephemeralError.retryCountdownSeconds === void 0 ? "n/a" : `\`${e.ephemeralError.retryCountdownSeconds}s\``)), r.join(`
`);
}