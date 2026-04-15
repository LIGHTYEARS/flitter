function sl0(T, R, a) {
  let e = el0(T);
  return {
    state: rl0(T, R.messageId, e),
    event: tl0(R, e, a)
  };
}
function ol0(T) {
  return {
    type: "error",
    message: `Failed to send user message: ${T}`,
    code: "MESSAGE_ERROR"
  };
}
function pl0(T) {
  let R = atob(T),
    a = new Uint8Array(R.length);
  for (let e = 0; e < R.length; e++) a[e] = R.charCodeAt(e);
  return a;
}
function _l0(T) {
  if (!T || typeof T !== "object") return !1;
  let R = T.queuedMessage;
  if (!R || typeof R !== "object") return !1;
  return typeof R.messageId === "string";
}
function bl0(T) {
  if (!T || typeof T !== "object") return !1;
  return typeof T.id === "string";
}
function ml0(T) {
  if (_l0(T)) return T.queuedMessage.messageId;
  if (bl0(T)) return T.id;
  throw Error("reduceQueuedMessages requires getQueuedMessageId for this message shape");
}
function ul0(T, R, a = {}) {
  let e = a.getQueuedMessageId ?? ml0;
  if (R.type === "queued_messages") return [...R.messages];
  if (R.type === "queued_message_added") {
    if (a.dedupeAdded && T.some(t => e(t) === e(R.message))) return [...T];
    return [...T, R.message];
  }
  if (!T.some(t => e(t) === R.queuedMessageId)) return [...T];
  return T.filter(t => e(t) !== R.queuedMessageId);
}