function Rl0(T) {
  let R = atob(T),
    a = new Uint8Array(R.length);
  for (let e = 0; e < R.length; e++) a[e] = R.charCodeAt(e);
  return a;
}
function QeT(T, R) {
  return {
    ...T,
    pendingOptimisticUserMessages: R
  };
}
function kkT() {
  return {
    latestAgentLoopState: null,
    pendingOptimisticUserMessages: new Map()
  };
}
function al0(T, R) {
  if (T.latestAgentLoopState === R) return T;
  return {
    ...T,
    latestAgentLoopState: R
  };
}
function el0(T) {
  if (T.latestAgentLoopState === null || T.latestAgentLoopState === "idle") return "message_added";
  return "queued_message_added";
}
function tl0(T, R, a) {
  if (R === "message_added") return {
    type: "message_added",
    message: {
      type: "message_added",
      message: {
        role: "user",
        messageId: T.messageId,
        content: T.content,
        threadId: a ?? Yn0
      },
      seq: 0
    }
  };
  return {
    type: "queued_message_added",
    message: {
      type: "queued_message_added",
      message: {
        interrupt: !1,
        queuedMessage: {
          role: "user",
          messageId: T.messageId,
          content: T.content,
          userState: T.userState,
          discoveredGuidanceFiles: T.discoveredGuidanceFiles
        }
      },
      seq: 0
    }
  };
}