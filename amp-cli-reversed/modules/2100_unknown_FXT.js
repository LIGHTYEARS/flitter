class FXT {
  sequences;
  activeSequence = null;
  constructor(T = new Map()) {
    this.sequences = T;
  }
  handleKeyEvent(T) {
    if (this.activeSequence) {
      let R = this.activeSequence.handleKeyEvent(T);
      if (R === "matched") {
        let a = this.sequences.get(this.activeSequence);
        return this.activeSequence = null, {
          intent: a,
          consumed: !0,
          progress: null
        };
      } else if (R === "progress") return {
        intent: null,
        consumed: !0,
        progress: this.activeSequence.getProgress()
      };else this.activeSequence = null;
    }
    for (let [R, a] of this.sequences) {
      let e = R.handleKeyEvent(T);
      if (e === "matched") return {
        intent: a,
        consumed: !0,
        progress: null
      };else if (e === "progress") return this.activeSequence = R, {
        intent: null,
        consumed: !0,
        progress: R.getProgress()
      };
    }
    return {
      intent: null,
      consumed: !1,
      progress: null
    };
  }
  isInProgress() {
    return this.activeSequence !== null;
  }
  getProgress() {
    return this.activeSequence?.getProgress() ?? null;
  }
  reset() {
    this.activeSequence = null;
    for (let T of this.sequences.keys()) T.reset();
  }
  dispose() {
    for (let T of this.sequences.keys()) T.dispose();
  }
}