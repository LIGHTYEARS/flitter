class W7T {
  constructor() {
    this.event = null, this.data = [], this.chunks = [];
  }
  decode(T) {
    if (T.endsWith("\r")) T = T.substring(0, T.length - 1);
    if (!T) {
      if (!this.event && !this.data.length) return null;
      let t = {
        event: this.event,
        data: this.data.join(`
`),
        raw: this.chunks
      };
      return this.event = null, this.data = [], this.chunks = [], t;
    }
    if (this.chunks.push(T), T.startsWith(":")) return null;
    let [R, a, e] = GxR(T, ":");
    if (e.startsWith(" ")) e = e.substring(1);
    if (R === "event") this.event = e;else if (R === "data") this.data.push(e);
    return null;
  }
}