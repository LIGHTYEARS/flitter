class Zx {
  frontBuffer;
  backBuffer;
  width;
  height;
  needsFullRefresh = !1;
  cursorPosition = null;
  cursorVisible = !1;
  cursorShape = 0;
  constructor(T = 80, R = 24) {
    this.width = T, this.height = R, this.frontBuffer = new pY(T, R), this.backBuffer = new pY(T, R);
  }
  getSize() {
    return {
      width: this.width,
      height: this.height
    };
  }
  resize(T, R) {
    this.width = T, this.height = R, this.frontBuffer.resize(T, R), this.backBuffer.resize(T, R);
  }
  getBuffer() {
    return this.backBuffer;
  }
  setDefaultColors(T, R) {
    this.frontBuffer.setDefaultColors(T, R), this.backBuffer.setDefaultColors(T, R);
  }
  setIndexRgbMapping(T) {
    this.frontBuffer.setIndexRgbMapping(T), this.backBuffer.setIndexRgbMapping(T);
  }
  getCell(T, R) {
    return this.backBuffer.getCell(T, R);
  }
  setCell(T, R, a) {
    this.backBuffer.setCell(T, R, a);
  }
  setChar(T, R, a, e, t) {
    this.backBuffer.setChar(T, R, a, e, t);
  }
  mergeBorderChar(T, R, a, e) {
    this.backBuffer.mergeBorderChar(T, R, a, e);
  }
  clear() {
    this.backBuffer.clear();
  }
  fill(T, R, a, e, t = " ", r = {}) {
    this.backBuffer.fill(T, R, a, e, t, r);
  }
  present() {
    let T = this.frontBuffer;
    this.frontBuffer = this.backBuffer, this.backBuffer = T;
  }
  getDiff() {
    let T = [],
      R = this.frontBuffer.getCellRows(),
      a = this.backBuffer.getCellRows(),
      e = (t, r, h) => {
        if (h.width <= 1) return !1;
        for (let i = 1; i < h.width; i++) {
          let c = t[r + i];
          if (!c) return !1;
          if (!(c.char === " " && c.width === 1 && YVT(c.style, h.style) && gH(c.hyperlink, h.hyperlink))) return !1;
        }
        return !0;
      };
    if (this.needsFullRefresh) {
      for (let t = 0; t < this.height; t++) {
        let r = a[t];
        if (!r) continue;
        for (let h = 0; h < this.width; h++) {
          let i = r[h] ?? Ul;
          if (T.push({
            x: h,
            y: t,
            cell: i
          }), e(r, h, i)) h += i.width - 1;
        }
      }
      return this.needsFullRefresh = !1, T;
    }
    for (let t = 0; t < this.height; t++) {
      let r = R[t],
        h = a[t];
      if (!r || !h) continue;
      for (let i = 0; i < this.width; i++) {
        let c = r[i] ?? Ul,
          s = h[i] ?? Ul;
        if (c === Ul && s === Ul) continue;
        if (!dm0(c, s)) {
          if (T.push({
            x: i,
            y: t,
            cell: s
          }), e(h, i, s)) i += s.width - 1;
        } else if (e(h, i, s)) i += s.width - 1;
      }
    }
    return T;
  }
  getFrontBuffer() {
    return this.frontBuffer;
  }
  getBackBuffer() {
    return this.backBuffer;
  }
  markForRefresh() {
    this.needsFullRefresh = !0;
  }
  get requiresFullRefresh() {
    return this.needsFullRefresh;
  }
  setCursor(T, R) {
    this.cursorPosition = {
      x: T,
      y: R
    }, this.cursorVisible = !0;
  }
  setCursorPositionHint(T, R) {
    this.cursorPosition = {
      x: T,
      y: R
    };
  }
  clearCursor() {
    this.cursorPosition = null, this.cursorVisible = !1;
  }
  getCursor() {
    return this.cursorPosition;
  }
  isCursorVisible() {
    return this.cursorVisible;
  }
  setCursorShape(T) {
    this.cursorShape = T;
  }
  getCursorShape() {
    return this.cursorShape;
  }
}