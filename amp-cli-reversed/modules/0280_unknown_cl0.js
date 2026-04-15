function il0(T, R) {
  let a = T;
  for (let e of R) a = CKT(a, e).state;
  return a;
}
function cl0(T, R) {
  let a = new Set(R.messages.map(e => e.queuedMessage.messageId));
  for (let [e, t] of T.pendingOptimisticUserMessages) {
    if (t !== "queued_message_added") continue;
    if (!a.has(e)) return !0;
  }
  return !1;
}