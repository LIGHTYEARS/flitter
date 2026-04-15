class zXT {
  sequence;
  timeout;
  matchedKeys = [];
  timeoutId = null;
  constructor(T, R = {}) {
    this.sequence = T, this.timeout = R.timeout ?? 2000;
  }
  getProgress() {
    return {
      matched: [...this.matchedKeys],
      remaining: this.sequence.slice(this.matchedKeys.length)
    };
  }
  isInProgress() {
    return this.matchedKeys.length > 0;
  }
  reset() {
    if (this.matchedKeys = [], this.timeoutId) clearTimeout(this.timeoutId), this.timeoutId = null;
  }
  handleKeyEvent(T) {
    let R = Ik0(T);
    if (!R) return "none";
    let a = this.matchedKeys.length,
      e = this.sequence[a];
    if (e && XxT(R, e)) {
      if (this.matchedKeys.push(e), this.timeoutId) clearTimeout(this.timeoutId), this.timeoutId = null;
      if (this.matchedKeys.length === this.sequence.length) return this.reset(), "matched";
      return this.timeoutId = setTimeout(() => this.reset(), this.timeout), "progress";
    } else if (this.matchedKeys.length > 0) {
      this.reset();
      let t = this.sequence[0];
      if (t && XxT(R, t)) return this.matchedKeys.push(t), this.timeoutId = setTimeout(() => this.reset(), this.timeout), "progress";
    }
    return "none";
  }
  dispose() {
    this.reset();
  }
  toString() {
    return this.sequence.map(T => {
      return T.replace("ctrl+", "C-").replace("meta+", "M-").replace("alt+", "A-");
    }).join(" ");
  }
}