function T4(T, R, a = {}) {
  if (T === R) return !0;
  return T.id === R.id && (a.includeVersion === !1 || T.v === R.v) && T.created === R.created && T.title === R.title && T.userLastInteractedAt === R.userLastInteractedAt && T.messageCount === R.messageCount && T.originThreadID === R.originThreadID && T.mainThreadID === R.mainThreadID && T.agentMode === R.agentMode && T.usesDtw === R.usesDtw && T.archived === R.archived && T.creatorUserID === R.creatorUserID && JC(T.relationships, R.relationships) && JC(T.summaryStats, R.summaryStats) && JC(T.env, R.env) && JC(T.meta, R.meta);
}