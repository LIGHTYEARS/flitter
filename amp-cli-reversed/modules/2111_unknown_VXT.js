function Mk0(T) {
  return T.replace(/\r\n|\r/g, `
`);
}
function Dk0(T) {
  return T.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, "");
}
function wk0(T) {
  let R = T;
  return R = Mk0(R), R = Dk0(R), R;
}
class VXT {
  eventBuffer = [];
  bufferTimer = null;
  filterDirection = null;
  lastEventTime = 0;
  onEmitEvent = () => {};
  constructor(T) {
    this.onEmitEvent = T;
  }
  handleWheelEvent(T) {
    if (T.button !== "wheel_up" && T.button !== "wheel_down") return !0;
    let R = Date.now();
    if (this.filterDirection !== null) if (R - this.lastEventTime > Nk0) this.filterDirection = null;else return this.lastEventTime = R, T.button === this.filterDirection;
    if (this.lastEventTime = R, this.eventBuffer.push(T), !this.bufferTimer) this.bufferTimer = setTimeout(() => {
      this.processBuffer();
    }, Bk0);
    return !1;
  }
  processBuffer() {
    if (this.bufferTimer = null, this.eventBuffer.length === 0) return;
    if (this.eventBuffer.some(T => T.button === "wheel_down")) {
      this.filterDirection = "wheel_down";
      for (let T of this.eventBuffer) if (T.button === "wheel_down") this.onEmitEvent(T);
    } else {
      this.filterDirection = "wheel_up";
      for (let T of this.eventBuffer) this.onEmitEvent(T);
    }
    this.eventBuffer = [];
  }
}