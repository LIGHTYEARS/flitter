function CKT(T, R) {
  let a = T.pendingOptimisticUserMessages.get(R);
  if (a === "queued_message_added") return {
    state: T,
    suppressQueuedMessageAdded: !0
  };
  if (a !== "message_added") return {
    state: T,
    suppressQueuedMessageAdded: !1
  };
  let e = new Map(T.pendingOptimisticUserMessages);
  return e.set(R, "queued_message_added"), {
    state: QeT(T, e),
    suppressQueuedMessageAdded: !1
  };
}