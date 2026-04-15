function $z(T, R, a) {
  if (T.readyState === 1) T.close(R, a);else if ("close" in T && T.readyState === WebSocket.OPEN) T.close(R, a);
}
function VI(T) {
  return {
    actorId: T.actor_id,
    name: T.name,
    key: Ct0(T.key),
    createTs: T.create_ts,
    startTs: T.start_ts ?? null,
    connectableTs: T.connectable_ts ?? null,
    sleepTs: T.sleep_ts ?? null,
    destroyTs: T.destroy_ts ?? null,
    error: T.error ?? void 0
  };
}