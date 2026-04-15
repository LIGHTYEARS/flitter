function rl0(T, R, a) {
  let e = new Map(T.pendingOptimisticUserMessages);
  return e.set(R, a), QeT(T, e);
}
function Z1(T, R) {
  if (!T.pendingOptimisticUserMessages.has(R)) return T;
  let a = new Map(T.pendingOptimisticUserMessages);
  return a.delete(R), QeT(T, a);
}
function hl0(T, R) {
  let a = T.pendingOptimisticUserMessages.get(R);
  if (!a) return {
    state: T,
    suppressMessageAdded: !1,
    syntheticQueuedMessageRemoved: null
  };
  let e = Z1(T, R);
  if (a === "message_added") return {
    state: e,
    suppressMessageAdded: !1,
    syntheticQueuedMessageRemoved: null
  };
  return {
    state: e,
    suppressMessageAdded: !1,
    syntheticQueuedMessageRemoved: {
      type: "queued_message_removed",
      queuedMessageId: R,
      seq: 0
    }
  };
}