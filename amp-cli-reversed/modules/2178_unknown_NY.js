function B1T(T) {
  if (T.kind === "search" && zx0(T.program) && T.query) {
    if (T.path) return `Grep ${T.path} "${T.query}"`;
    return `Grep "${T.query}"`;
  }
  return uzT(T);
}
function zx0(T) {
  if (!T) return !1;
  return new Set(["rg", "ripgrep", "grep", "egrep", "fgrep", "ag", "ack", "pt", "git grep"]).has(T);
}
function ye(T) {
  return typeof T === "object" && T !== null;
}
class NY {
  reader;
  readerUnsubscribe;
  messages = [];
  _entries = [];
  _selectedMessageIndex = null;
  listeners = new Set();
  onSelectionChange = null;
  constructor(T) {
    this.reader = T, this.updateEntries(), this.readerUnsubscribe = this.reader.subscribe(() => {
      this.updateEntries(), this.notify();
    });
  }
  get entries() {
    return this._entries;
  }
  get selectedMessageIndex() {
    return this._selectedMessageIndex;
  }
  subscribe(T) {
    return this.listeners.add(T), () => {
      this.listeners.delete(T);
    };
  }
  dispose() {
    this.readerUnsubscribe(), this.onSelectionChange = null;
  }
  updateEntries() {
    if (this.messages = this.reader.read(), this._entries = mx0(this.messages), this._selectedMessageIndex !== null && !this.isUserMessageIndex(this._selectedMessageIndex)) this._selectedMessageIndex = null;
  }
  selectPreviousUserMessage() {
    let T = this.getUserMessageIndices();
    if (T.length === 0) return !1;
    if (this._selectedMessageIndex === null) return this.setSelectedMessageIndex(T[T.length - 1] ?? null);
    for (let R = T.length - 1; R >= 0; R--) {
      let a = T[R];
      if (a !== void 0 && a < this._selectedMessageIndex) return this.setSelectedMessageIndex(a);
    }
    return !1;
  }
  selectNextUserMessage() {
    if (this._selectedMessageIndex === null) return !1;
    for (let T of this.getUserMessageIndices()) if (T > this._selectedMessageIndex) return this.setSelectedMessageIndex(T);
    return this.setSelectedMessageIndex(null);
  }
  setSelectedMessageIndex(T) {
    if (this._selectedMessageIndex === T) return !1;
    return this._selectedMessageIndex = T, this.onSelectionChange?.(T), this.notify(), !0;
  }
  getUserMessageIndices() {
    let T = [];
    for (let R = 0; R < this._entries.length; R++) {
      let a = this._entries[R];
      if (a?.type === "message" && a.role === "user") T.push(R);
    }
    return T;
  }
  isUserMessageIndex(T) {
    let R = this._entries[T];
    return R?.type === "message" && R.role === "user";
  }
  notify() {
    for (let T of this.listeners) T();
  }
}