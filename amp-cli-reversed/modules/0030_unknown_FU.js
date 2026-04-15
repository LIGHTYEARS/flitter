class FU {
  constructor() {
    this.endOfStream = !1, this.interrupted = !1, this.peekQueue = [];
  }
  async peek(T, R = !1) {
    let a = await this.read(T, R);
    return this.peekQueue.push(T.subarray(0, a)), a;
  }
  async read(T, R = !1) {
    if (T.length === 0) return 0;
    let a = this.readFromPeekBuffer(T);
    if (!this.endOfStream) a += await this.readRemainderFromStream(T.subarray(a), R);
    if (a === 0 && !R) throw new fe();
    return a;
  }
  readFromPeekBuffer(T) {
    let R = T.length,
      a = 0;
    while (this.peekQueue.length > 0 && R > 0) {
      let e = this.peekQueue.pop();
      if (!e) throw Error("peekData should be defined");
      let t = Math.min(e.length, R);
      if (T.set(e.subarray(0, t), a), a += t, R -= t, t < e.length) this.peekQueue.push(e.subarray(t));
    }
    return a;
  }
  async readRemainderFromStream(T, R) {
    let a = 0;
    while (a < T.length && !this.endOfStream) {
      if (this.interrupted) throw new DaT();
      let e = await this.readFromStream(T.subarray(a), R);
      if (e === 0) break;
      a += e;
    }
    if (!R && a < T.length) throw new fe();
    return a;
  }
}