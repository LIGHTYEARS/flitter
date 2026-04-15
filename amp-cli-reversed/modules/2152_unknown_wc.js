function nx0(T) {
  return "scrollOffset" in T;
}
class wc {
  _text = "";
  _cursorPosition = 0;
  _preferredColumn = 0;
  _listeners = [];
  _scrollListeners = [];
  _layoutEngine;
  _vScrollOffset = 0;
  _onInsertText;
  _killBuffer = "";
  _selectionBase = 0;
  _selectionExtent = 0;
  _promptRules = [];
  constructor(T = "", R = 1 / 0) {
    this._text = T, this._layoutEngine = new Kw(T, {
      maxWidth: R,
      wrapMode: "none",
      emojiSupported: !1
    }), this._cursorPosition = this._layoutEngine.graphemes.length, this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition), this._collapseSelection();
  }
  get text() {
    return this._text;
  }
  set text(T) {
    if (this._text !== T) this._text = T, this._layoutEngine.updateText(T), this._cursorPosition = this._layoutEngine.graphemes.length, this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition), this._notifyListeners();
  }
  get cursorPosition() {
    return this._cursorPosition;
  }
  set cursorPosition(T) {
    this._setCursorPosition(T, !1);
  }
  _setCursorPosition(T, R = !1) {
    let a = this._getMinimumCursorPosition(),
      e = Math.max(a, Math.min(T, this._layoutEngine.graphemes.length));
    if (this._cursorPosition !== e) {
      if (R && !this.hasSelection) this._selectionBase = this._cursorPosition;
      if (this._cursorPosition = e, this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition), R) this._selectionExtent = e;else this._collapseSelection();
      this._notifyListeners();
    }
  }
  get graphemes() {
    return this._layoutEngine.graphemes;
  }
  get hasSelection() {
    return this._selectionBase !== this._selectionExtent;
  }
  get selectionRange() {
    if (!this.hasSelection) return null;
    return {
      start: Math.min(this._selectionBase, this._selectionExtent),
      end: Math.max(this._selectionBase, this._selectionExtent)
    };
  }
  get selectedText() {
    let T = this.selectionRange;
    if (!T) return "";
    return this.graphemes.slice(T.start, T.end).join("");
  }
  get lines() {
    return this._text.split(`
`);
  }
  clearSelection() {
    this._collapseSelection(), this._notifyListeners();
  }
  updateLayoutConfig(T, R = "none", a) {
    let e = {
      maxWidth: T,
      wrapMode: R
    };
    if (a !== void 0) e.emojiSupported = a;
    this._layoutEngine.updateConfig(e);
  }
  calculateLayoutLines(T, R = "none", a) {
    let e = {
      maxWidth: T,
      wrapMode: R
    };
    if (a !== void 0) e.emojiSupported = a;
    return new Kw(this._text, e).lines;
  }
  offsetToPosition(T) {
    return this._layoutEngine.offsetToPosition(T);
  }
  positionToOffset(T, R) {
    return this._layoutEngine.positionToOffset(T, R);
  }
  get cursorTextPosition() {
    return this.offsetToPosition(this._cursorPosition);
  }
  _getColumnFromOffset(T) {
    return this.offsetToPosition(T).column;
  }
  _getStringPositionFromGraphemeIndex(T) {
    if (T <= 0) return 0;
    try {
      let R = B9(this._text);
      if (T < R.length) {
        let a = 0;
        for (let e = 0; e < T; e++) a += R[e].length;
        return a;
      }
      return this._text.length;
    } catch (R) {
      let a = Array.from(this._text),
        e = 0;
      for (let t = 0; t < Math.min(T, a.length); t++) e += a[t].length;
      return Math.min(e, this._text.length);
    }
  }
  _getLayoutColumnFromOffset(T) {
    let R = this.getLayoutLines();
    for (let a = 0; a < R.length; a++) {
      let e = R[a];
      if (e && T >= e.startOffset && T <= e.endOffset) return T - e.startOffset;
    }
    return 0;
  }
  getLineCount() {
    return this._layoutEngine.lines.length;
  }
  getLayoutLines() {
    return this._layoutEngine.lines;
  }
  getLine(T) {
    return this._layoutEngine.getLineText(T);
  }
  getCursorVisualRow() {
    return this.getCurrentLayoutLine()?.index ?? 0;
  }
  set onInsertText(T) {
    this._onInsertText = T;
  }
  get onInsertText() {
    return this._onInsertText;
  }
  insertText(T) {
    if (this._onInsertText && this._onInsertText(T, this) === !1) return;
    if (this.hasSelection) this.deleteSelectedText();
    let R = this._getStringPositionFromGraphemeIndex(this._cursorPosition);
    this._text = this._text.slice(0, R) + T + this._text.slice(R), this._layoutEngine.updateText(this._text);
    let a = B9(T);
    this._cursorPosition += a.length, this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition), this._collapseSelection(), this._notifyListeners();
  }
  deleteWordLeft() {
    let T = this._getWordBoundary(-1),
      R = Math.max(0, this._cursorPosition - T);
    if (R > 0) {
      let a = this._getStringPositionFromGraphemeIndex(T),
        e = this._getStringPositionFromGraphemeIndex(this._cursorPosition);
      this._killBuffer = this._text.slice(a, e);
    }
    this.deleteText(R);
  }
  deleteWordRight() {
    let T = this._getWordBoundary(1),
      R = Math.max(0, T - this._cursorPosition);
    if (R > 0) {
      let a = this._getStringPositionFromGraphemeIndex(this._cursorPosition),
        e = this._getStringPositionFromGraphemeIndex(T);
      this._killBuffer = this._text.slice(a, e);
    }
    this.deleteForward(R);
  }
  yankText() {
    if (this._killBuffer) this.insertText(this._killBuffer);
  }
  _isWordBoundary = T => lx0.has(T) || Ax0.has(T);
  _getWordBoundariesAt(T) {
    let R = this.graphemes,
      a = Math.max(0, Math.min(T, R.length));
    if (a < R.length && this._isWordBoundary(R[a])) return {
      start: a,
      end: a
    };
    let e = a,
      t = a;
    while (e > 0 && !this._isWordBoundary(R[e - 1])) e--;
    while (t < R.length && !this._isWordBoundary(R[t])) t++;
    return {
      start: e,
      end: t
    };
  }
  _getWordBoundary(T) {
    let R = this._cursorPosition,
      a = this.graphemes,
      e = R;
    if (T === 1) {
      while (e < a.length && this._isWordBoundary(a[e])) e++;
      while (e < a.length && !this._isWordBoundary(a[e])) e++;
      return Math.min(a.length, e);
    } else {
      e--;
      while (e >= 0 && this._isWordBoundary(a[e])) e--;
      while (e >= 0 && !this._isWordBoundary(a[e])) e--;
      return Math.max(0, e + 1);
    }
  }
  deleteSelectedOrText(T = 1) {
    if (this.hasSelection) this.deleteSelectedText();else this.deleteText(T);
  }
  deleteSelectedText() {
    let T = this.selectionRange;
    if (!T) return;
    let R = this._getStringPositionFromGraphemeIndex(T.start),
      a = this._getStringPositionFromGraphemeIndex(T.end);
    this._text = this._text.slice(0, R) + this._text.slice(a), this._layoutEngine.updateText(this._text), this._cursorPosition = T.start, this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition), this._collapseSelection(), this._notifyListeners();
  }
  deleteText(T = 1) {
    if (T <= 0) return;
    let R = Math.max(0, this._cursorPosition - T);
    if (this._cursorPosition - R > 0) {
      let a = this._getStringPositionFromGraphemeIndex(R),
        e = this._getStringPositionFromGraphemeIndex(this._cursorPosition);
      this._text = this._text.slice(0, a) + this._text.slice(e), this._layoutEngine.updateText(this._text), this._cursorPosition = R, this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition), this._collapseSelection(), this._notifyListeners();
    }
  }
  deleteForward(T = 1) {
    if (T <= 0) return;
    let R = B9(this._text),
      a = Math.min(T, R.length - this._cursorPosition);
    if (a > 0) {
      let e = this._getStringPositionFromGraphemeIndex(this._cursorPosition),
        t = this._getStringPositionFromGraphemeIndex(this._cursorPosition + a);
      this._text = this._text.slice(0, e) + this._text.slice(t), this._layoutEngine.updateText(this._text), this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition), this._collapseSelection(), this._notifyListeners();
    }
  }
  moveCursorLeft(T = 1, R = !1) {
    this._setCursorPosition(this._getHorizontalPosition(-T), R);
  }
  moveCursorRight(T = 1, R = !1) {
    this._setCursorPosition(this._getHorizontalPosition(T), R);
  }
  moveCursorWordBoundary(T, R = !1) {
    this._setCursorPosition(this._getWordBoundary(T), R);
  }
  moveCursorToStart(T = !1) {
    this._setCursorPosition(0, T);
  }
  moveCursorToEnd(T = !1) {
    this._setCursorPosition(this.graphemes.length, T);
  }
  moveCursorUp(T = 1, R = !1) {
    this.moveCursorVertically(-Math.abs(T), R);
  }
  moveCursorDown(T = 1, R = !1) {
    this.moveCursorVertically(Math.abs(T), R);
  }
  moveCursorVertically(T, R = !1) {
    let a = this._getVerticalPosition(T);
    if (a >= 0) this._setCursorPosition(a, R);
  }
  moveCursorToLineStart(T = !1) {
    let R = this._getLineStartPosition();
    this._setCursorPosition(R, T);
  }
  moveCursorToLineEnd(T = !1) {
    this._setCursorPosition(this._getLineEndPosition(), T);
  }
  deleteCurrentLine() {
    if (this._text.length === 0) return;
    this._collapseSelection();
    let {
        line: T,
        column: R
      } = this.cursorTextPosition,
      a = this.positionToOffset(T, 0),
      e = T === this.getLineCount() - 1,
      t = e ? this.graphemes.length : this.positionToOffset(T + 1, 0),
      r = e && a > 0 ? a - 1 : a,
      h = e ? t : t,
      i = this._getStringPositionFromGraphemeIndex(r),
      c = this._getStringPositionFromGraphemeIndex(h);
    this._killBuffer = this._text.slice(i, c), this._text = this._text.slice(0, i) + this._text.slice(c), this._layoutEngine.updateText(this._text);
    let s = e ? T - 1 : T;
    if (s < 0) s = 0;
    let A = this.getLine(s),
      l = Math.min(R, B9(A).length);
    this.cursorPosition = this.positionToOffset(s, l), this._notifyListeners();
  }
  deleteToLineEnd() {
    let T = this.cursorPosition,
      R = this.graphemes,
      a = R.length;
    for (let r = T; r < R.length; r++) if (R[r] === `
`) {
      a = r;
      break;
    }
    if (a <= T) return;
    let e = this._getStringPositionFromGraphemeIndex(T),
      t = this._getStringPositionFromGraphemeIndex(a);
    this._killBuffer = this._text.slice(e, t), this._text = this._text.slice(0, e) + this._text.slice(t), this._layoutEngine.updateText(this._text), this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition), this._notifyListeners();
  }
  deleteToLineStart() {
    let T = this.cursorPosition;
    if (T === 0) return;
    let R = this.graphemes;
    if (T > 0 && R[T - 1] === `
`) {
      let a = T - 1,
        e = this._getStringPositionFromGraphemeIndex(a),
        t = this._getStringPositionFromGraphemeIndex(T);
      this._killBuffer = this._text.slice(e, t), this._text = this._text.slice(0, e) + this._text.slice(t), this._layoutEngine.updateText(this._text), this._cursorPosition = a, this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition);
    } else {
      let a = 0;
      for (let i = T - 1; i >= 0; i--) if (R[i] === `
`) {
        a = i + 1;
        break;
      }
      let e = this._getMinimumCursorPosition(),
        t = a;
      if (T === e) t = 0;else if (e > 0 && a < e) t = e;
      let r = this._getStringPositionFromGraphemeIndex(t),
        h = this._getStringPositionFromGraphemeIndex(T);
      this._killBuffer = this._text.slice(r, h), this._text = this._text.slice(0, r) + this._text.slice(h), this._layoutEngine.updateText(this._text), this._cursorPosition = t, this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition);
    }
    this._collapseSelection(), this._notifyListeners();
  }
  clear() {
    this.text = "";
  }
  addListener(T) {
    this._listeners.push(T);
  }
  removeListener(T) {
    let R = this._listeners.indexOf(T);
    if (R >= 0) this._listeners.splice(R, 1);
  }
  _notifyListeners() {
    for (let T of this._listeners) T();
  }
  addScrollListener(T) {
    this._scrollListeners.push(T);
  }
  removeScrollListener(T) {
    let R = this._scrollListeners.indexOf(T);
    if (R >= 0) this._scrollListeners.splice(R, 1);
  }
  _notifyScrollListeners() {
    for (let T of this._scrollListeners) T();
  }
  getScrollOffset() {
    return this._vScrollOffset;
  }
  setScrollOffset(T) {
    if (this._vScrollOffset !== T) this._vScrollOffset = T, this._notifyScrollListeners();
  }
  resetScrollOffset() {
    this.setScrollOffset(0);
  }
  setPromptRules(T) {
    this._promptRules = T;
  }
  _getMinimumCursorPosition() {
    let T = this._promptRules.find(R => R.match(this._text));
    if (!T || !T.concealPrefix) return 0;
    return B9(T.display).length;
  }
  dispose() {
    this._listeners.length = 0;
  }
  _collapseSelection() {
    this._selectionBase = this._cursorPosition, this._selectionExtent = this._cursorPosition;
  }
  selectWordAt(T) {
    if (this.graphemes.length === 0) return;
    let {
      start: R,
      end: a
    } = this._getWordBoundariesAt(T);
    if (R === a) {
      this._cursorPosition = R, this._collapseSelection(), this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition), this._notifyListeners();
      return;
    }
    this._selectionBase = R, this._selectionExtent = a, this._cursorPosition = a, this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition), this._notifyListeners();
  }
  getWordBoundariesAt(T) {
    if (this.graphemes.length === 0) return {
      start: 0,
      end: 0
    };
    return this._getWordBoundariesAt(T);
  }
  setSelectionRange(T, R) {
    let a = this._getMinimumCursorPosition(),
      e = this._layoutEngine.graphemes.length,
      t = Math.max(a, Math.min(T, e)),
      r = Math.max(a, Math.min(R, e));
    this._selectionBase = t, this._selectionExtent = r, this._cursorPosition = r, this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition), this._notifyListeners();
  }
  selectLineAt(T) {
    let R = this.graphemes;
    if (R.length === 0) return;
    let a = Math.max(0, Math.min(T, R.length)),
      e = a;
    while (e > 0 && R[e - 1] !== `
`) e--;
    let t = a;
    while (t < R.length && R[t] !== `
`) t++;
    let r = e === t && t < R.length && R[t] === `
`;
    if (t < R.length && R[t] === `
`) t++;
    this._selectionBase = e, this._selectionExtent = t, this._cursorPosition = r ? e : t, this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition), this._notifyListeners();
  }
  startSelectionAt(T) {
    this._setCursorPosition(T, !1);
  }
  extendSelectionTo(T) {
    this._setCursorPosition(T, !0);
  }
  getCurrentLayoutLine(T = this.cursorPosition) {
    let R = this.getLayoutLines();
    for (let a = 0; a < R.length; a++) {
      let e = R[a];
      if (e && T >= e.startOffset && T <= e.endOffset) return {
        index: a,
        line: e
      };
    }
    return null;
  }
  moveCursorToPosition(T, R = !1) {
    this._setCursorPosition(T, R);
  }
  _getVerticalPosition(T) {
    let R = this.cursorPosition,
      a = this.getLayoutLines(),
      e = this.getCurrentLayoutLine(R);
    if (!e) return -1;
    let t = e.index,
      r = this._getLayoutColumnFromOffset(R);
    if (this._preferredColumn === this._getColumnFromOffset(R)) this._preferredColumn = r;
    let h = T < 0 ? Math.max(0, t + T) : Math.min(a.length - 1, t + T),
      i = a[h];
    if (!i) return -1;
    let c = this.graphemes.slice(i.startOffset, i.endOffset).join(""),
      s = B9(c),
      A = Math.min(this._preferredColumn, s.length);
    return i.startOffset + A;
  }
  _getLineStartPosition() {
    let T = this.graphemes,
      R = this._getMinimumCursorPosition(),
      a = 0;
    for (let e = this.cursorPosition - 1; e >= 0; e--) if (T[e] === `
`) {
      a = e + 1;
      break;
    }
    return Math.max(R, a);
  }
  _getLineEndPosition() {
    let T = this.graphemes,
      R = T.length;
    for (let a = this.cursorPosition; a < T.length; a++) if (T[a] === `
`) {
      R = a;
      break;
    }
    return R;
  }
  _getHorizontalPosition(T) {
    let R = this._getMinimumCursorPosition();
    return Math.max(R, Math.min(this.graphemes.length, this._cursorPosition + T));
  }
}