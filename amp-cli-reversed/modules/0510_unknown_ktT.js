class ktT {
  capabilities;
  currentStyle = {};
  currentX = 0;
  currentY = 0;
  constructor(T) {
    this.capabilities = T;
  }
  updateCapabilities(T) {
    this.capabilities = T;
  }
  render(T) {
    if (T.length === 0) return "";
    let R = new ytT(),
      a = null,
      e,
      t = -1,
      r = -1;
    for (let h of T) {
      let i = h.cell.char,
        c = yu0(i),
        s = c ? Pu0(i) : i;
      if (e8(!c, `Cell contains disallowed control at (${h.x}, ${h.y}):`, `U+${i.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0")}`), !(a !== null && h.y === r && h.x === t && Su0(a, h.cell.style) && gH(e, h.cell.hyperlink))) {
        if (this.currentX !== h.x || this.currentY !== h.y) R.append($xT(h.y, h.x)), this.currentX = h.x, this.currentY = h.y;
        R.append(vu0(h.cell.style, this.currentStyle, this.capabilities)), R.append(ju0(h.cell.hyperlink, this.currentStyle)), a = h.cell.style, e = h.cell.hyperlink;
      }
      let A = c ? {
        ...h.cell,
        char: s
      } : h.cell;
      R.append(du0(A, this.capabilities)), this.currentX += h.cell.width, t = h.x + h.cell.width, r = h.y;
    }
    return R.toString();
  }
  clearScreen() {
    return this.currentX = 0, this.currentY = 0, this.currentStyle = {}, gxT + _Y() + Zm0 + Xm0;
  }
  hideCursor() {
    return Ym0;
  }
  showCursor() {
    return Qm0;
  }
  setCursorShape(T) {
    if (this.capabilities?.supportsCursorShape === !1) return "";
    return fu0(T);
  }
  reset() {
    return this.currentStyle = {}, gxT + _Y();
  }
  moveTo(T, R) {
    return this.currentX = T, this.currentY = R, $xT(R, T);
  }
  getCursorPosition() {
    return {
      x: this.currentX,
      y: this.currentY
    };
  }
  resetState() {
    this.currentStyle = {}, this.currentX = 0, this.currentY = 0;
  }
  startSync() {
    return Jm0;
  }
  endSync() {
    return Tu0;
  }
  enterAltScreen() {
    return eu0 + this.clearScreen();
  }
  exitAltScreen() {
    return tu0;
  }
  resetCursor() {
    return Vm0;
  }
  enableMouse(T = !1) {
    return Iu0(T);
  }
  disableMouse() {
    return gu0();
  }
  enableEmojiWidth() {
    return su0;
  }
  disableEmojiWidth() {
    return ou0;
  }
  enableInBandResize() {
    return nu0;
  }
  disableInBandResize() {
    return lu0;
  }
  enableBracketedPaste() {
    return Ru0;
  }
  disableBracketedPaste() {
    return au0;
  }
  enableKittyKeyboard(T = {}) {
    return pu0(T);
  }
  disableKittyKeyboard() {
    return Au0;
  }
  enableModifyOtherKeys() {
    return _u0;
  }
  disableModifyOtherKeys() {
    return bu0;
  }
  setMouseShape(T) {
    return mu0(T);
  }
  setProgressBarIndeterminate() {
    return ku0;
  }
  setProgressBarOff() {
    return ZVT;
  }
  setProgressBarPaused() {
    return xu0;
  }
}