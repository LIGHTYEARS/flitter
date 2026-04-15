function fuT(T) {
  return {
    id: T.id,
    v: T.v,
    created: T.created,
    title: T.title ?? null,
    userLastInteractedAt: HqR(T),
    messageCount: ve(T),
    env: T.env,
    originThreadID: T.originThreadID,
    mainThreadID: T.mainThreadID,
    relationships: [...(T.relationships ?? []), ...GET(T)],
    summaryStats: {
      diffStats: qET(T),
      messageCount: ve(T)
    },
    agentMode: T.agentMode,
    usesDtw: WqR(T),
    archived: T.archived,
    creatorUserID: zqR(T),
    meta: FqR(T)
  };
}