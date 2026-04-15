class Kw {
  _text = "";
  _config;
  _lines = null;
  _graphemes = null;
  constructor(T, R) {
    this._text = T, this._config = R;
  }
  updateText(T) {
    if (this._text !== T) this._text = T, this._invalidateCache();
  }
  updateConfig(T) {
    if (JSON.stringify(this._config) !== JSON.stringify(T)) this._config = T, this._invalidateCache();
  }
  get lines() {
    if (this._lines === null) this._computeLines();
    return this._lines;
  }
  get graphemes() {
    if (this._graphemes === null) this._graphemes = B9(this._text);
    return this._graphemes;
  }
  getLineCount() {
    return this._text.split(`
`).length;
  }
  getLine(T) {
    let R = this.lines;
    return T >= 0 && T < R.length ? R[T] ?? null : null;
  }
  offsetToLineIndex(T) {
    let R = this.lines;
    for (let a = 0; a < R.length; a++) {
      let e = R[a];
      if (e && T >= e.startOffset && T <= e.endOffset) return a;
    }
    return Math.max(0, R.length - 1);
  }
  offsetToPosition(T) {
    let R = this.graphemes,
      a = 0,
      e = 0;
    for (let t = 0; t < T && t < R.length; t++) if (R[t] === `
`) a++, e = 0;else e++;
    return {
      line: a,
      column: e
    };
  }
  positionToOffset(T, R) {
    let a = this.graphemes,
      e = 0,
      t = 0;
    for (let r = 0; r <= a.length; r++) {
      if (e === T && t === R) return r;
      if (e > T) return r;
      if (r >= a.length) return r;
      if (a[r] === `
`) e++, t = 0;else t++;
    }
    return a.length;
  }
  getLineText(T) {
    let R = this._text.split(`
`);
    return T >= 0 && T < R.length ? R[T] ?? "" : "";
  }
  _invalidateCache() {
    this._lines = null, this._graphemes = null;
  }
  _computeLines() {
    let T = this.graphemes,
      {
        maxWidth: R,
        wrapMode: a,
        emojiSupported: e = !1
      } = this._config;
    if (this._lines = [], T.length === 0) {
      this._lines.push({
        startOffset: 0,
        endOffset: 0,
        width: 0,
        isHardBreak: !1
      });
      return;
    }
    let t = 0,
      r = 0,
      h = 0;
    while (h < T.length) {
      let c = T[h];
      if (!c) {
        h++;
        continue;
      }
      if (c === `
`) {
        this._lines.push({
          startOffset: t,
          endOffset: h,
          width: r,
          isHardBreak: !0
        }), t = h + 1, r = 0, h++;
        continue;
      }
      let s = J8(c, e);
      if (a !== "none" && r + s > R && r > 0) {
        let A = h;
        if (a === "word") {
          let o = this._findWordWrapPoint(T, t, h);
          if (o < h) {
            if (this._getNextWordLength(T, o, e) > R) A = this._fillToCapacity(T, t, R, e);else A = o;
          } else A = this._fillToCapacity(T, t, R, e);
        }
        let l = this._calculateLineWidth(T, t, A, e);
        if (this._lines.push({
          startOffset: t,
          endOffset: A,
          width: l,
          isHardBreak: !1
        }), t = A, a === "word") {
          if (t < T.length && T[t] && /\s/.test(T[t])) while (t < T.length && T[t] && /\s/.test(T[t])) t++;
        }
        r = 0, h = t;
        continue;
      }
      r += s, h++;
    }
    let i = T.length > 0 && T[T.length - 1] === `
`;
    if (t < T.length || this._lines.length === 0 || i) this._lines.push({
      startOffset: t,
      endOffset: T.length,
      width: r,
      isHardBreak: !1
    });
  }
  _findWordWrapPoint(T, R, a) {
    for (let e = a - 1; e > R; e--) if (T[e] && /\s/.test(T[e])) {
      while (e > R && T[e] && /\s/.test(T[e])) e--;
      return e + 1;
    }
    return a;
  }
  _getNextWordLength(T, R, a) {
    let e = 0,
      t = R;
    while (t < T.length && T[t] && /\s/.test(T[t])) t++;
    while (t < T.length && T[t] && !/\s/.test(T[t])) {
      let r = T[t];
      if (!r || r === `
`) break;
      e += J8(r, a), t++;
    }
    return e;
  }
  _fillToCapacity(T, R, a, e) {
    let t = 0,
      r = R;
    for (let h = R; h < T.length; h++) {
      let i = T[h];
      if (!i) continue;
      if (i === `
`) break;
      let c = J8(i, e);
      if (t + c > a) break;
      t += c, r = h + 1;
    }
    return r;
  }
  _calculateLineWidth(T, R, a, e) {
    let t = 0;
    for (let r = R; r < a; r++) {
      let h = T[r];
      if (h && h !== `
`) t += J8(h, e);
    }
    return t;
  }
}