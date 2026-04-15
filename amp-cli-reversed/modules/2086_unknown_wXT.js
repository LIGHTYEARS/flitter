function lk0(T) {
  return T.length === 2 && !Array.isArray(T[0]);
}
class wXT {
  list;
  toolProgressMap;
  activeErrorMessage = null;
  transientErrorMessage = null;
  transientErrorTimeoutID = null;
  errorMessageSubject = new f0(null);
  agentStateSubject = new f0("idle");
  titleSubject = new f0(void 0);
  queuedMessagesSubject = new f0([]);
  messageCount = 0;
  constructor() {
    this.list = nk0(), this.toolProgressMap = new Map();
  }
  reader() {
    return this.list.reader();
  }
  agentState() {
    return this.agentStateSubject;
  }
  errorMessage() {
    return this.errorMessageSubject;
  }
  title() {
    return this.titleSubject;
  }
  queuedMessages() {
    return this.queuedMessagesSubject;
  }
  addQueuedMessage(T) {
    let R = this.queuedMessagesSubject.getValue();
    this.queuedMessagesSubject.next([...R, T]);
  }
  removeQueuedMessage(T) {
    let R = this.queuedMessagesSubject.getValue().filter(a => a.queuedMessage.messageId !== T);
    this.queuedMessagesSubject.next(R);
  }
  onMessageAdded(T) {
    if (T.parentToolUseId) return;
    let R = this.list.get(T.message.messageId),
      a = R ? R.messageId : ++this.messageCount,
      e = _k0(T.message, a);
    this.list.set(T.message.messageId, e), T.message.content.filter(t => t.type === "tool_result").map(t => t.toolUseID).forEach(t => {
      this.toolProgressMap.set(t, {
        complete: !0
      }), this.list.replace(`fake-tool-result:${t}`, T.message.messageId, e);
    });
  }
  onDelta(T) {
    if (T.parentToolCallId) return;
    if (T.role === "user") {
      this.onUserDelta(T);
      return;
    }
    let R = this.list.get(T.messageId);
    if (UlR(R) && R.state?.type !== "streaming") return;
    let a = R ? R.messageId : ++this.messageCount,
      e = pk0(T, a, R);
    if (e) this.list.set(T.messageId, e);
  }
  onUserDelta(T) {
    let R = T.blocks ?? [];
    if (R.length === 0) return;
    let a = this.list.get(T.messageId),
      e = a ? a.messageId : ++this.messageCount,
      t = {
        role: "user",
        content: R,
        messageId: e,
        dtwMessageID: T.messageId
      };
    this.list.set(T.messageId, t);
    for (let r of R) {
      if (r.type !== "tool_result") continue;
      let h = r.toolUseID;
      this.toolProgressMap.set(h, {
        complete: !0
      }), this.list.replace(`fake-tool-result:${h}`, T.messageId, t);
    }
  }
  onAgentStates(T) {
    this.agentStateSubject.next(T.state);
  }
  onQueuedMessages(T) {
    if (T.type === "queued_messages") this.queuedMessagesSubject.next(T.messages);else if (T.type === "queued_message_added") this.addQueuedMessage(T.message);else if (T.type === "queued_message_removed") this.removeQueuedMessage(T.queuedMessageId);
  }
  onErrorNotice(T) {
    if (this.activeErrorMessage !== null) return;
    this.transientErrorMessage = T.message, this.syncErrorMessage(), this.scheduleTransientErrorClear();
  }
  onActiveErrorState(T) {
    if (T.type === "error_set") this.activeErrorMessage = T.error.message, this.clearTransientError();else this.activeErrorMessage = null;
    this.syncErrorMessage();
  }
  syncErrorMessage() {
    let T = this.activeErrorMessage ?? this.transientErrorMessage;
    if (this.errorMessageSubject.getValue() === T) return;
    this.errorMessageSubject.next(T);
  }
  scheduleTransientErrorClear() {
    this.clearTransientErrorTimer(), this.transientErrorTimeoutID = setTimeout(() => {
      this.transientErrorTimeoutID = null, this.transientErrorMessage = null, this.syncErrorMessage();
    }, Ak0);
  }
  clearTransientError() {
    this.clearTransientErrorTimer(), this.transientErrorMessage = null;
  }
  clearTransientErrorTimer() {
    if (this.transientErrorTimeoutID === null) return;
    clearTimeout(this.transientErrorTimeoutID), this.transientErrorTimeoutID = null;
  }
  onToolProgress(T) {
    if (T.parentToolCallId) return;
    let {
        toolCallId: R
      } = T,
      a = this.toolProgressMap.get(R);
    if (a && a.complete) return;
    this.list.set(`fake-tool-result:${R}`, bk0(T)), this.toolProgressMap.set(R, {
      ...T,
      complete: !1
    });
  }
  onTitle(T) {
    this.titleSubject.next(T.title || void 0);
  }
}