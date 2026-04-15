function zt0(T) {
  return {
    actorQuery: T
  };
}
function feT(T) {
  return "getForKey" in T || "getOrCreateForKey" in T;
}
async function vl(T, R) {
  if ("getForId" in T.actorQuery) return T.actorQuery.getForId.actorId;
  if (!feT(T.actorQuery)) {
    let {
      actorId: e
    } = await nS(void 0, T.actorQuery, R);
    return e;
  }
  if (T.resolvedActorId !== void 0) return T.resolvedActorId;
  if (T.pendingResolve) return await T.pendingResolve;
  let a = nS(void 0, T.actorQuery, R).then(({
    actorId: e
  }) => {
    return T.resolvedActorId = e, T.pendingResolve = void 0, e;
  }).catch(e => {
    if (T.pendingResolve === a) T.pendingResolve = void 0;
    throw e;
  });
  return T.pendingResolve = a, await a;
}