class kDT {
  forceRestart = !1;
  consume() {
    let T = this.forceRestart;
    return this.forceRestart = !1, T;
  }
  replenish() {
    this.forceRestart = !0;
  }
}