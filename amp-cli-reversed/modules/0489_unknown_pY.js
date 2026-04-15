class pY {
  cells;
  width;
  height;
  indexToRgb = [];
  defaultBg = LT.default();
  defaultFg = LT.default();
  constructor(T, R) {
    this.width = T, this.height = R, this.cells = [], this.resize(T, R);
  }
  setDefaultColors(T, R) {
    this.defaultBg = T, this.defaultFg = R;
  }
  setIndexRgbMapping(T) {
    this.indexToRgb = T;
  }
  getSize() {
    return {
      width: this.width,
      height: this.height
    };
  }
  resize(T, R) {
    this.width = T, this.height = R, this.cells = Array(R).fill(null).map(() => Array(T).fill(null).map(() => Ul));
  }
  getCell(T, R) {
    if (T < 0 || T >= this.width || R < 0 || R >= this.height) return null;
    return this.cells[R]?.[T] || null;
  }
  setCell(T, R, a) {
    if (T < 0 || T >= this.width || R < 0 || R >= this.height) return;
    let e = a.style.fg ? uS(a.style.fg) : void 0,
      t = a.style.bg ? uS(a.style.bg) : void 0;
    if (e !== void 0 && e < 1 || t !== void 0 && t < 1) {
      let r = this.cells[R]?.[T] || Ul,
        h = Em0(a.style, r.style, this.defaultBg, this.defaultFg, this.indexToRgb);
      if (this.cells[R]) this.cells[R][T] = {
        char: a.char,
        style: h,
        width: a.width
      };
    } else if (this.cells[R]) this.cells[R][T] = {
      ...a,
      style: {
        ...a.style
      }
    };
    if (a.width > 1) {
      for (let r = 1; r < a.width; r++) if (T + r < this.width && this.cells[R]) this.cells[R][T + r] = a9(" ", a.style, 1);
    }
  }
  setChar(T, R, a, e, t) {
    this.setCell(T, R, a9(a, e, t));
  }
  mergeBorderChar(T, R, a, e) {
    if (!yxT(a)) {
      this.setChar(T, R, a, e, 1);
      return;
    }
    let t = this.getCell(T, R);
    if (!t || !yxT(t.char)) {
      this.setChar(T, R, a, e, 1);
      return;
    }
    let r = fm0(t.char, a);
    if (!r) {
      this.setChar(T, R, a, e, 1);
      return;
    }
    this.setChar(T, R, r, Im0(t.style, e), 1);
  }
  clear() {
    for (let T = 0; T < this.height; T++) for (let R = 0; R < this.width; R++) {
      let a = this.cells[T];
      if (a) a[R] = Ul;
    }
  }
  fill(T, R, a, e, t = " ", r = {}) {
    let h = a9(t, r);
    for (let i = 0; i < e; i++) for (let c = 0; c < a; c++) this.setCell(T + c, R + i, h);
  }
  copyTo(T) {
    let {
      width: R,
      height: a
    } = T.getSize();
    for (let e = 0; e < Math.min(this.height, a); e++) for (let t = 0; t < Math.min(this.width, R); t++) {
      let r = this.getCell(t, e);
      if (r) T.setCell(t, e, r);
    }
  }
  getCells() {
    return this.cells.map(T => T.map(R => ({
      ...R,
      style: {
        ...R.style
      }
    })));
  }
  getCellRows() {
    return this.cells;
  }
  setCursor(T, R) {}
  clearCursor() {}
  setCursorShape(T) {}
  markForRefresh() {}
}