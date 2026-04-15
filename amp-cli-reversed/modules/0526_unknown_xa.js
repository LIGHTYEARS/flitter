class xa {
  state = [!0, !1, !0, !1, !0, !1, !0, !1];
  previousState = [];
  generation = 0;
  maxGenerations = 15;
  neighborMap = [[1, 3, 4, 5, 7], [0, 2, 4, 5, 6], [1, 3, 5, 6, 7], [0, 2, 4, 6, 7], [0, 1, 3, 5, 7], [0, 1, 2, 4, 6], [1, 2, 3, 5, 7], [0, 2, 3, 4, 6]];
  step() {
    let T = this.state.map((r, h) => {
        let i = this.neighborMap[h].filter(c => this.state[c]).length;
        if (r) return i === 2 || i === 3;
        return i === 3 || i === 6;
      }),
      R = T.every((r, h) => r === this.state[h]),
      a = this.previousState.length > 0 && T.every((r, h) => r === this.previousState[h]);
    this.previousState = [...this.state], this.state = T, this.generation++;
    let e = T.every(r => !r),
      t = T.filter(r => r).length;
    if (R || a || this.generation >= this.maxGenerations || e || t < 2) {
      let r;
      do r = Array.from({
        length: 8
      }, () => Math.random() > 0.6); while (r.filter(h => h).length < 3);
      this.state = r, this.previousState = [], this.generation = 0;
    }
  }
  toBraille() {
    let T = [0, 1, 2, 6, 3, 4, 5, 7],
      R = 10240;
    for (let a = 0; a < 8; a++) if (this.state[a]) R |= 1 << T[a];
    return String.fromCharCode(R);
  }
}