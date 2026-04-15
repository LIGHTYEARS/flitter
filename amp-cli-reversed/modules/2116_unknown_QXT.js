function Yh(T, R) {
  if (T.length === 0) return 0;
  let a = [...T].sort((r, h) => r - h),
    e = Math.max(0, Math.min(R, 1)),
    t = Math.ceil(a.length * e) - 1;
  return a[Math.max(0, t)] || 0;
}
class QXT {
  frameTimes = [];
  phaseTimes = {
    build: [],
    layout: [],
    paint: [],
    render: []
  };
  keyEventTimes = [];
  mouseEventTimes = [];
  repaintPercents = [];
  bytesWritten = [];
  lastKeyEventTime = 0;
  lastMouseEventTime = 0;
  lastRepaintPercent = 0;
  lastBytesWritten = 0;
  MAX_SAMPLES = 1024;
  recordFrame(T) {
    if (this.frameTimes.push(T), this.frameTimes.length > this.MAX_SAMPLES) this.frameTimes.shift();
  }
  recordPhase(T, R) {
    let a = this.phaseTimes[T];
    if (a.push(R), a.length > this.MAX_SAMPLES) a.shift();
  }
  recordKeyEvent(T) {
    if (this.lastKeyEventTime = T, this.keyEventTimes.push(T), this.keyEventTimes.length > this.MAX_SAMPLES) this.keyEventTimes.shift();
  }
  recordMouseEvent(T) {
    if (this.lastMouseEventTime = T, this.mouseEventTimes.push(T), this.mouseEventTimes.length > this.MAX_SAMPLES) this.mouseEventTimes.shift();
  }
  recordRepaintPercent(T) {
    if (this.lastRepaintPercent = T, this.repaintPercents.push(T), this.repaintPercents.length > this.MAX_SAMPLES) this.repaintPercents.shift();
  }
  recordBytesWritten(T) {
    if (this.lastBytesWritten = T, this.bytesWritten.push(T), this.bytesWritten.length > this.MAX_SAMPLES) this.bytesWritten.shift();
  }
  getFrameP99() {
    return Yh(this.frameTimes, 0.99);
  }
  getFrameP95() {
    return Yh(this.frameTimes, 0.95);
  }
  getPhaseP99(T) {
    return Yh(this.phaseTimes[T], 0.99);
  }
  getPhaseP95(T) {
    return Yh(this.phaseTimes[T], 0.95);
  }
  getLastKeyEventTime() {
    return this.lastKeyEventTime;
  }
  getKeyEventP99() {
    return Yh(this.keyEventTimes, 0.99);
  }
  getKeyEventP95() {
    return Yh(this.keyEventTimes, 0.95);
  }
  getLastMouseEventTime() {
    return this.lastMouseEventTime;
  }
  getMouseEventP99() {
    return Yh(this.mouseEventTimes, 0.99);
  }
  getMouseEventP95() {
    return Yh(this.mouseEventTimes, 0.95);
  }
  getLastRepaintPercent() {
    return this.lastRepaintPercent;
  }
  getRepaintPercentP99() {
    return Yh(this.repaintPercents, 0.99);
  }
  getRepaintPercentP95() {
    return Yh(this.repaintPercents, 0.95);
  }
  getLastBytesWritten() {
    return this.lastBytesWritten;
  }
  getBytesWrittenP99() {
    return Yh(this.bytesWritten, 0.99);
  }
  getBytesWrittenP95() {
    return Yh(this.bytesWritten, 0.95);
  }
  reset() {
    this.frameTimes = [];
    for (let T of Object.values(LtT)) this.phaseTimes[T] = [];
    this.keyEventTimes = [], this.mouseEventTimes = [], this.repaintPercents = [], this.bytesWritten = [], this.lastKeyEventTime = 0, this.lastMouseEventTime = 0, this.lastRepaintPercent = 0, this.lastBytesWritten = 0;
  }
}