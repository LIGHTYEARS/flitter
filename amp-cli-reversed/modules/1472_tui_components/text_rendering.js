I9 = class I9 extends Ve {
  data;
  constructor({
    key: T,
    data: R,
    child: a
  }) {
    super(T !== void 0 ? {
      key: T,
      child: a
    } : {
      child: a
    });
    this.data = R;
  }
  updateShouldNotify(T) {
    return this.data !== T.data || this.data.size.width !== T.data.size.width || this.data.size.height !== T.data.size.height || this.data.capabilities !== T.data.capabilities;
  }
  static of(T) {
    let R = T.dependOnInheritedWidgetOfExactType(I9);
    if (R) return R.widget.data;
    throw Error("MediaQuery not found in context. Wrap your app with MediaQuery widget.");
  }
  static sizeOf(T) {
    return I9.of(T).size;
  }
  static capabilitiesOf(T) {
    return I9.of(T).capabilities;
  }
};
R1T = class R1T extends qm {
  _child;
  _context;
  constructor(T) {
    super(T);
  }
  get statelessWidget() {
    return this.widget;
  }
  get child() {
    return this._child;
  }
  get renderObject() {
    return this._child?.renderObject;
  }
  mount() {
    this._context = new Ib(this, this.widget), this.rebuild(), this.markMounted();
  }
  unmount() {
    if (this._child) this._child.unmount(), this.removeChild(this._child), this._child = void 0;
    this._context = void 0, super.unmount();
  }
  update(T) {
    if (this.widget === T) return;
    if (super.update(T), this._context) this._context.widget = T;
    this.rebuild();
  }
  performRebuild() {
    this.rebuild();
  }
  rebuild() {
    if (!this._context) throw Error("Cannot rebuild unmounted element");
    let T = this.statelessWidget.build(this._context);
    if (this._child) {
      if (this._child.widget === T) return;
      if (this._child.widget.canUpdate(T)) this._child.update(T);else {
        let R = this._child,
          a = this.findNearestRenderObjectAncestor();
        if (a && R.renderObject) a.dropChild(R.renderObject);else if (!a && R.renderObject) R.renderObject.detach();
        if (this._child.unmount(), this.removeChild(this._child), this._child = T.createElement(), this.addChild(this._child), this._child.mount(), a && this._child.renderObject) a.adoptChild(this._child.renderObject), this._child.renderObject.markNeedsLayout();else if (!a && this._child.renderObject) this._child.renderObject.attach(), this._child.renderObject.markNeedsLayout();
        if (this._child.renderObject) this._child.renderObject.markNeedsLayout();
      }
    } else this._child = T.createElement(), this.addChild(this._child), this._child.mount();
  }
  findNearestRenderObjectAncestor() {
    let T = this.parent;
    while (T) {
      if (T.renderObject) {
        if (this._child?.renderObject && T.renderObject === this._child.renderObject) {
          T = T.parent;
          continue;
        }
        return T.renderObject;
      }
      T = T.parent;
    }
    return;
  }
};
xT = class xT extends to {
  text;
  textAlign;
  maxLines;
  overflow;
  selectable;
  constructor({
    key: T,
    text: R,
    textAlign: a = "left",
    maxLines: e,
    overflow: t = "clip",
    selectable: r = !1
  }) {
    super(T ? {
      key: T
    } : {});
    this.text = a1T(R), this.textAlign = a, this.maxLines = e, this.overflow = t, this.selectable = r, this.sendDebugData({
      text: R
    });
  }
  static spans(T) {
    return new xT({
      text: new G("", void 0, T)
    });
  }
  createElement() {
    return new e1T(this);
  }
  createRenderObject() {
    return new t1T(this.text, this.textAlign, this.maxLines, this.overflow, !1, LT.index(8), LT.yellow, this.selectable);
  }
  updateRenderObject(T) {}
};
e1T = class e1T extends bp {
  constructor(T) {
    super(T);
  }
  get richTextWidget() {
    return this.widget;
  }
  mount() {
    super.mount(), this._updateRenderObjectWithMediaQuery();
  }
  performRebuild() {
    super.performRebuild(), setTimeout(() => this._ensureRenderObjectContext(), 0);
  }
  _ensureRenderObjectContext() {
    if (!this.renderObject) return;
    let T = this.renderObject,
      R = new Ib(this, this.widget);
    T.setContext(R);
  }
  update(T) {
    super.update(T), this._updateRenderObjectWithMediaQuery();
  }
  _updateRenderObjectWithMediaQuery() {
    if (!this.renderObject) return;
    try {
      let T = new Ib(this, this.widget),
        R = I9.of(T),
        a = Z0.maybeOf(T),
        e = a?.colorScheme.selection ?? LT.index(8),
        t = a?.colorScheme.copyHighlight ?? LT.yellow,
        r = this.renderObject;
      r.setContext(T), r.updateText(this.richTextWidget.text, this.richTextWidget.textAlign, this.richTextWidget.maxLines, this.richTextWidget.overflow, R.supportsEmojiWidth, e, t, this.richTextWidget.selectable);
    } catch (T) {
      let R = new Ib(this, this.widget),
        a = this.renderObject;
      a.setContext(R), a.updateText(this.richTextWidget.text, this.richTextWidget.textAlign, this.richTextWidget.maxLines, this.richTextWidget.overflow, !1, LT.index(8), LT.yellow, this.richTextWidget.selectable);
    }
  }
};
t1T = class t1T extends O9 {
  _text;
  _textAlign;
  _maxLines;
  _overflow;
  _emojiWidthSupported;
  _selectable;
  selectableId = 0;
  _selectionArea;
  _selectedRanges = [];
  set selectionArea(T) {
    this._selectionArea = T;
  }
  get selectionArea() {
    return this._selectionArea;
  }
  _cachedStyledCells;
  _selectionStart = null;
  _selectionEnd = null;
  _characterPositions = [];
  _visualLines = [];
  _selectionColor = LT.index(8);
  _copyHighlightColor = LT.yellow;
  _highlightMode = "selection";
  _hasTappableSpans = !1;
  _context;
  constructor(T, R, a, e = "clip", t = !1, r = LT.index(8), h = LT.yellow, i = !1) {
    super();
    this._text = T, this._textAlign = R, this._maxLines = a, this._overflow = e, this._emojiWidthSupported = t, this._selectable = i, this._selectionColor = r, this._copyHighlightColor = h, this._hasTappableSpans = this.hasAnyTappableSpans();
  }
  get text() {
    return this._text;
  }
  get textAlign() {
    return this._textAlign;
  }
  get maxLines() {
    return this._maxLines;
  }
  get overflow() {
    return this._overflow;
  }
  get hasMouseListeners() {
    return this._hasTappableSpans;
  }
  handleMouseEvent(T) {
    if (!this._hasTappableSpans) return;
    switch (T.type) {
      case "hover":
        {
          if (this.getOnClickAtPosition(T.localPosition.x, T.localPosition.y)) ha.instance.requestCursorChange(B3.POINTER);else ha.instance.requestCursorChange(B3.DEFAULT);
          break;
        }
      case "exit":
        ha.instance.requestCursorChange(B3.DEFAULT);
        break;
      case "click":
        {
          let R = this.getOnClickAtPosition(T.localPosition.x, T.localPosition.y);
          if (R) R();
          break;
        }
    }
  }
  updateSelection(T, R, a = "selection") {
    if (this._selectionStart !== T || this._selectionEnd !== R || this._highlightMode !== a) this._selectionStart = T, this._selectionEnd = R, this._highlightMode = a, this.markNeedsPaint();
  }
  setHighlightMode(T) {
    if (this._highlightMode !== T) this._highlightMode = T, this.markNeedsPaint();
  }
  get plainText() {
    return this._text.toPlainText();
  }
  getCharacterRect(T) {
    if (T < 0 || T >= this._characterPositions.length) return null;
    let R = this._characterPositions[T];
    if (!R) return null;
    return {
      x: R.x,
      y: R.y,
      width: R.width,
      height: 1
    };
  }
  getOffsetForPosition(T, R) {
    if (this._characterPositions.length === 0) return null;
    let a = Math.round(T),
      e = Math.floor(R),
      t = 1 / 0,
      r = 1 / 0,
      h = -1 / 0,
      i = -1 / 0;
    for (let A of this._characterPositions) t = Math.min(t, A.x), r = Math.min(r, A.y), h = Math.max(h, A.x + A.width), i = Math.max(i, A.y + 1);
    if (a < t || a >= h || e < r || e >= i) return null;
    for (let A = 0; A < this._characterPositions.length; A++) {
      let l = this._characterPositions[A];
      if (!l) continue;
      if (a >= l.x && a < l.x + l.width && e >= l.y && e < l.y + 1) return A;
    }
    for (let A = 0; A < this._characterPositions.length; A++) {
      let l = this._characterPositions[A];
      if (!l) continue;
      if (e >= l.y && e < l.y + 1) {
        if (a < l.x) return A;
        if (A === this._characterPositions.length - 1 || this._characterPositions[A + 1] && this._characterPositions[A + 1].y > l.y) {
          if (a >= l.x + l.width) return A + 1;
        }
      }
    }
    let c = 0,
      s = 1 / 0;
    for (let A = 0; A < this._characterPositions.length; A++) {
      let l = this._characterPositions[A];
      if (!l) continue;
      let o = Math.abs(e - l.y) + Math.abs(a - l.x);
      if (o < s) s = o, c = A;
    }
    return c;
  }
  getVisualLines() {
    return this._visualLines;
  }
  getRenderableCharacterCount() {
    return this._characterPositions.length;
  }
  getHyperlinkAtPosition(T, R) {
    let a = this.getOffsetForPosition(T, R);
    if (a === null) return null;
    return this.getCachedStyledCells()[a]?.hyperlink?.uri ?? null;
  }
  getOnClickAtPosition(T, R) {
    let a = this.getOffsetForPosition(T, R);
    if (a === null) return null;
    let e = 0,
      t = h => {
        if (h.text) {
          let i = B9(h.text).length;
          if (a >= e && a < e + i) return {
            found: !0,
            onClick: h.onClick ?? null
          };
          e += i;
        }
        if (h.children) for (let i of h.children) {
          let c = t(i);
          if (c.found) return c;
        }
        return {
          found: !1
        };
      },
      r = t(this._text);
    return r.found ? r.onClick : null;
  }
  hasAnyTappableSpans() {
    let T = R => {
      if (R.onClick) return !0;
      if (R.children) {
        for (let a of R.children) if (T(a)) return !0;
      }
      return !1;
    };
    return T(this._text);
  }
  updateText(T, R, a, e = "clip", t = !1, r = LT.index(8), h = LT.yellow, i = !1) {
    this._text = T, this._textAlign = R, this._maxLines = a, this._overflow = e, this._emojiWidthSupported = t, this._selectionColor = r, this._copyHighlightColor = h, this._selectable = i, this._hasTappableSpans = this.hasAnyTappableSpans(), this._cachedStyledCells = void 0, this._characterPositions = [], this._visualLines = [], this._cachedStyledCells = this.getStyledCells(), this.markNeedsLayout(), this.markNeedsPaint();
  }
  getStyledCells() {
    let T = [],
      R = this._context ? Z0.of(this._context).colorScheme.foreground : LT.default(),
      a = this.getStyledSegments(this._text, new cT({
        color: R
      })),
      e = this._context ? CA.shouldForceDim(this._context) : !1;
    for (let t of a) {
      let r = B9(t.text);
      for (let h of r) {
        let i = J8(h, this._emojiWidthSupported),
          c = {};
        if (t.style.color) c.fg = t.style.color;
        if (t.style.backgroundColor) c.bg = t.style.backgroundColor;
        if (t.style.bold) c.bold = t.style.bold;
        if (t.style.italic) c.italic = t.style.italic;
        if (t.style.underline) c.underline = t.style.underline;
        if (t.style.strikethrough) c.strikethrough = t.style.strikethrough;
        if (t.style.dim || e) c.dim = !0;
        T.push(a9(h, c, i, t.hyperlink));
      }
    }
    return T;
  }
  getCachedStyledCells() {
    return this._cachedStyledCells ?? this.getStyledCells();
  }
  getTotalCellsWidth(T) {
    let R = 0;
    for (let a of T) R += a.width;
    return R;
  }
  wrapCells(T, R) {
    if (R === 1 / 0) return this.handleExplicitLineBreaksInCells(T);
    let a = [],
      e = [],
      t = 0,
      r = 0;
    while (r < T.length) {
      let h = T[r];
      if (!h) {
        r++;
        continue;
      }
      if (h.char === `
`) {
        e.push(h), a.push(e), e = [], t = 0, r++;
        continue;
      }
      if (t + h.width > R && e.length > 0) {
        let i = e.length - 1;
        while (i >= 0 && !/\s/.test(e[i].char)) i--;
        if (i >= 0) {
          let c = e.slice(i + 1);
          e = e.slice(0, i + 1), a.push(e), e = c, t = 0;
          for (let s of c) t += s.width;
        } else a.push(e), e = [], t = 0;
      }
      e.push(h), t += h.width, r++;
    }
    if (e.length > 0) a.push(e);
    return a.length > 0 ? a : [[]];
  }
  handleExplicitLineBreaksInCells(T) {
    let R = [],
      a = [];
    for (let e of T) if (e.char === `
`) a.push(e), R.push(a), a = [];else a.push(e);
    if (a.length > 0) R.push(a);
    return R.length > 0 ? R : [[]];
  }
  performLayout() {
    let T = this._lastConstraints;
    e8(!!T, "performLayout called without constraints");
    let R = this.getCachedStyledCells(),
      a = isFinite(T.maxWidth) ? T.maxWidth : this.getTotalCellsWidth(R),
      e = this.wrapCells(R, a),
      t = this._maxLines ? e.slice(0, this._maxLines) : e,
      r = 0;
    for (let A of t) {
      let l = 0;
      for (let o of A) l += o.width;
      r = Math.max(r, l);
    }
    let h = t.length,
      i = t.length > 1,
      c,
      s;
    if (!isFinite(T.maxWidth)) c = r;else {
      let A;
      if (this._textAlign === "center" || this._textAlign === "right") A = T.maxWidth;else A = i ? T.maxWidth : r;
      c = Math.max(T.minWidth, Math.min(T.maxWidth, A));
    }
    if (!isFinite(T.maxHeight)) s = h;else {
      let A = i ? h : Math.min(h, T.maxHeight);
      s = Math.max(T.minHeight, A);
    }
    c = Math.max(0, c), s = Math.max(0, s), this.setSize(c, s), super.performLayout();
  }
  getMinIntrinsicWidth(T) {
    let R = this.getCachedStyledCells();
    if (this._maxLines === 1) return Math.max(this.getTotalCellsWidth(R), 1);
    let a = 0,
      e = 0,
      t = !1;
    for (let r of R) {
      if (r.char === `
`) {
        if (t) a = Math.max(a, e), e = 0, t = !1;
        continue;
      }
      if (/\s/.test(r.char)) {
        if (t) a = Math.max(a, e), e = 0, t = !1;
      } else {
        if (!t) e = 0, t = !0;
        e += r.width;
      }
    }
    if (t) a = Math.max(a, e);
    return Math.max(a, 1);
  }
  getMaxIntrinsicWidth(T) {
    let R = this.getCachedStyledCells();
    return Math.max(this.getTotalCellsWidth(R), 1);
  }
  getMinIntrinsicHeight(T) {
    let R = this.getCachedStyledCells(),
      a = this.wrapCells(R, T),
      e = this._maxLines ? a.slice(0, this._maxLines) : a;
    return Math.max(e.length, 1);
  }
  getMaxIntrinsicHeight(T) {
    return this.getMinIntrinsicHeight(T);
  }
  paint(T, R = 0, a = 0) {
    let e = R + this.offset.x,
      t = a + this.offset.y,
      r = this.getCachedStyledCells(),
      h = this.wrapCells(r, this.size.width),
      i = this._maxLines ? h.slice(0, this._maxLines) : h;
    if (this._maxLines && h.length > this._maxLines) i = this.applyCellOverflow(i, this.size.width);
    if (i.length > this.size.height) i = i.slice(0, this.size.height);
    this._characterPositions = [], this._visualLines = [];
    let c = 0;
    for (let s = 0; s < i.length; s++) {
      let A = i[s];
      if (!A) continue;
      let l = t + s;
      if (l >= 0 && l < T.getSize().height) {
        let o = e;
        if (this._textAlign === "center" || this._textAlign === "right") {
          let _ = 0,
            m = A.length - 1;
          while (m >= 0 && A[m] && /\s/.test(A[m]?.char || "")) m--;
          for (let b = 0; b <= m; b++) {
            let y = A[b];
            if (y) _ += y.width;
          }
          if (this._textAlign === "center") o = Math.max(e, e + Math.floor((this.size.width - _) / 2));else o = Math.max(e, e + this.size.width - _);
        }
        let n = Math.floor(o),
          p = e + this.size.width;
        for (let _ of A) {
          if (_.char === `
`) {
            this._characterPositions.push({
              x: n - e,
              y: s,
              width: 0
            }), c++;
            continue;
          }
          if (n >= p) break;
          if (n >= e) {
            let m = this._isCharacterSelected(c),
              b = {
                ..._
              };
            if (!_.style.bg && !m) {
              let y = T.getCell(n, l);
              if (y?.style.bg) b = {
                ...b,
                style: {
                  ...b.style,
                  bg: y.style.bg
                }
              };
            }
            if (m) if (this._highlightMode === "copy") b = {
              ...b,
              style: {
                ...b.style,
                fg: this._copyHighlightColor,
                reverse: !0
              }
            };else b = {
              ...b,
              style: {
                ...b.style,
                bg: this._selectionColor
              }
            };
            T.setCell(n, l, b);
          }
          this._characterPositions.push({
            x: n - e,
            y: s,
            width: _.width
          }), n += _.width, c++;
        }
      } else for (let o of A) this._characterPositions.push({
        x: 0,
        y: s,
        width: o.width
      }), c++;
      if (A.length > 0) {
        let o = this._characterPositions.length - A.length,
          n = this._characterPositions.length - 1;
        this._visualLines.push({
          y: s,
          start: o,
          end: n
        });
      }
    }
  }
  getStyledLines() {
    let T = this.getStyledSegments(this._text, new cT({
        color: LT.default()
      })),
      R = this.wrapStyledSegments(T, this.size.width),
      a = this._maxLines ? R.slice(0, this._maxLines) : R;
    if (this._maxLines && R.length > this._maxLines) a = this.applyTextOverflow(a, this.size.width);
    if (a.length > this.size.height) a = a.slice(0, this.size.height);
    this._characterPositions = [], this._visualLines = [];
    for (let e = 0; e < a.length; e++) {
      let t = a[e];
      if (t) this._addLineCharacterPositions(t, e);
    }
    return a;
  }
  wrapStyledSegments(T, R) {
    if (R === 1 / 0) return this.handleExplicitLineBreaks(T);
    let a = [],
      e = [],
      t = 0,
      r = !1;
    for (let h of T) {
      if (!h.text || typeof h.text !== "string") continue;
      let i = h.text.split(`
`),
        c = h.text.endsWith(`
`);
      for (let s = 0; s < i.length; s++) {
        let A = i[s];
        if (A === void 0) continue;
        if (s > 0) {
          if (e.length > 0) {
            let o = e[e.length - 1];
            if (o) o.text += `
`;
          } else e.push({
            text: `
`,
            style: h.style,
            hyperlink: h.hyperlink
          });
          a.push({
            segments: e,
            alignment: this._textAlign
          }), e = [], t = 0;
        }
        if (A.length === 0) continue;
        let l = this.splitIntoWords(A);
        for (let o = 0; o < l.length; o++) {
          let n = l[o];
          if (n === void 0) continue;
          let p = q8(n, this._emojiWidthSupported),
            _ = /^\s+$/.test(n);
          if (t + p > R && e.length > 0) a.push({
            segments: e,
            alignment: this._textAlign
          }), e = [], t = 0;
          let m = s > 0 && o === 0 || s === 0 && o === 0 && r;
          if (_ && e.length === 0 && !m) continue;
          if (s === 0 && o === 0) r = !1;
          let b = e[e.length - 1];
          if (e.length > 0 && b && this.segmentsEqual(b, h)) b.text += n;else e.push({
            text: n,
            style: h.style,
            hyperlink: h.hyperlink
          });
          t += p;
        }
      }
      r = c;
    }
    if (e.length > 0) a.push({
      segments: e,
      alignment: this._textAlign
    });
    if (a.length === 0) a.push({
      segments: [{
        text: "",
        style: new cT({
          color: LT.default()
        })
      }],
      alignment: this._textAlign
    });
    return a;
  }
  handleExplicitLineBreaks(T) {
    let R = [],
      a = [];
    for (let e of T) {
      if (!e.text || typeof e.text !== "string") continue;
      let t = e.text.split(`
`);
      for (let r = 0; r < t.length; r++) {
        if (r > 0) {
          if (a.length > 0) {
            let i = a[a.length - 1];
            if (i) i.text += `
`;
          } else a.push({
            text: `
`,
            style: e.style,
            hyperlink: e.hyperlink
          });
          R.push({
            segments: a,
            alignment: this._textAlign
          }), a = [];
        }
        let h = t[r];
        if (h !== void 0 && h.length > 0) a.push({
          text: h,
          style: e.style,
          hyperlink: e.hyperlink
        });
      }
    }
    if (a.length > 0) R.push({
      segments: a,
      alignment: this._textAlign
    });
    if (R.length === 0) R.push({
      segments: [{
        text: "",
        style: new cT({
          color: LT.default()
        })
      }],
      alignment: this._textAlign
    });
    return R;
  }
  stylesEqual(T, R) {
    return T.color === R.color && T.backgroundColor === R.backgroundColor && T.bold === R.bold && T.italic === R.italic && T.underline === R.underline && T.strikethrough === R.strikethrough && T.dim === R.dim;
  }
  segmentsEqual(T, R) {
    return this.stylesEqual(T.style, R.style) && (T.hyperlink?.uri === R.hyperlink?.uri && T.hyperlink?.id === R.hyperlink?.id || T.hyperlink === void 0 && R.hyperlink === void 0);
  }
  splitIntoWords(T) {
    let R = [],
      a = "",
      e = !1,
      t = B9(T);
    for (let r of t) {
      let h = /\s/.test(r);
      if (h !== e) {
        if (a.length > 0) R.push(a), a = "";
        e = h;
      }
      a += r;
    }
    if (a.length > 0) R.push(a);
    return R;
  }
  applyTextOverflow(T, R) {
    if (T.length === 0) return T;
    let a = T[T.length - 1];
    if (!a) return T;
    let e = [...T],
      t = q8("\u2026", this._emojiWidthSupported),
      r = R - t,
      h = [],
      i = 0,
      c = [],
      s = R;
    switch (this._overflow) {
      case "ellipsis":
        {
          for (let o of a.segments) {
            let n = q8(o.text, this._emojiWidthSupported);
            if (i + n <= r) h.push(o), i += n;else if (i < r) {
              let p = r - i,
                _ = Mw(o.text, p, this._emojiWidthSupported, "");
              if (_.length > 0) h.push({
                text: _,
                style: o.style,
                hyperlink: o.hyperlink
              });
              break;
            } else break;
          }
          let A = a.segments[a.segments.length - 1],
            l = a.segments.length > 0 && A ? A.style : new cT({
              color: LT.default()
            });
          h.push({
            text: "\u2026",
            style: l
          }), e[e.length - 1] = {
            segments: h,
            alignment: a.alignment
          };
          break;
        }
      case "fade":
      case "clip":
        {
          for (let A of a.segments) {
            if (s <= 0) break;
            let l = q8(A.text, this._emojiWidthSupported);
            if (l <= s) c.push(A), s -= l;else {
              let o = Mw(A.text, s, this._emojiWidthSupported, "");
              if (o.length > 0) c.push({
                text: o,
                style: A.style,
                hyperlink: A.hyperlink
              });
              break;
            }
          }
          e[e.length - 1] = {
            segments: c,
            alignment: a.alignment
          };
          break;
        }
      case "visible":
      default:
        break;
    }
    return e;
  }
  getStyledSegments(T, R, a) {
    let e = [],
      t = R.merge(T.style),
      r = T.hyperlink ?? a;
    if (T.text) e.push({
      text: T.text,
      style: t,
      hyperlink: r
    });
    if (T.children) for (let h of T.children) e.push(...this.getStyledSegments(h, t, r));
    return e;
  }
  _addLineCharacterPositions(T, R) {
    let a = 0;
    if (T.alignment === "center" || T.alignment === "right") {
      let h = 0;
      for (let i of T.segments) h += q8(i.text, this._emojiWidthSupported);
      if (T.alignment === "center") a = Math.max(0, Math.floor((this.size.width - h) / 2));else a = Math.max(0, this.size.width - h);
    }
    let e = this._characterPositions.length,
      t = a;
    for (let h of T.segments) {
      let i = B9(h.text);
      for (let c of i) {
        let s = J8(c, this._emojiWidthSupported);
        if (this._characterPositions.push({
          x: t,
          y: R,
          width: c === `
` ? 0 : s
        }), c !== `
`) t += s;
      }
    }
    let r = this._characterPositions.length - 1;
    if (r >= e) this._visualLines.push({
      y: R,
      start: e,
      end: r
    });
  }
  applyCellOverflow(T, R) {
    if (T.length === 0) return T;
    if (this._overflow === "visible") return T;
    let a = [...T],
      e = a[a.length - 1];
    if (!e) return a;
    switch (this._overflow) {
      case "ellipsis":
        {
          let t = q8("\u2026", this._emojiWidthSupported),
            r = R - t,
            h = [],
            i = 0;
          for (let A of e) if (i + A.width <= r) h.push(A), i += A.width;else break;
          let c = e[e.length - 1],
            s = c ? c.style : {};
          h.push(a9("\u2026", s, t)), a[a.length - 1] = h;
          break;
        }
      case "clip":
        {
          let t = [],
            r = 0;
          for (let h of e) if (r + h.width <= R) t.push(h), r += h.width;else break;
          a[a.length - 1] = t;
          break;
        }
      default:
        break;
    }
    return a;
  }
  _isCharacterSelected(T) {
    if (this._selectionStart === null || this._selectionEnd === null) return !1;
    let R = Math.min(this._selectionStart, this._selectionEnd),
      a = Math.max(this._selectionStart, this._selectionEnd);
    return T >= R && T < a;
  }
  attach() {
    super.attach();
  }
  setContext(T) {
    if (this._context = T, !this._selectable) return;
    let R = Yb.of(T);
    if (R && !this.selectionArea) {
      if (this.selectionArea = R, R.register(this), this.selectableId <= 0) this.selectableId = Math.floor(Math.random() * 1e6) + 1;
    }
  }
  detach() {
    if (this.selectionArea) this.selectionArea.unregister(this), this.selectionArea = void 0;
    super.detach();
  }
  onAttachToSelectionArea(T) {}
  onDetachFromSelectionArea(T) {}
  globalBounds() {
    if (this.size.width <= 0 || this.size.height <= 0) return qk0;
    let T = this.offset.x,
      R = this.offset.y,
      a = this.parent;
    while (a) {
      if (a instanceof O9) T += a.offset.x, R += a.offset.y;
      a = a.parent;
    }
    return {
      left: T,
      top: R,
      right: T + this.size.width,
      bottom: R + this.size.height
    };
  }
  globalToLocal(T) {
    let R = this.offset.x,
      a = this.offset.y,
      e = this.parent;
    while (e) {
      if (e instanceof O9) R += e.offset.x, a += e.offset.y;
      e = e.parent;
    }
    return {
      x: T.x - R,
      y: T.y - a
    };
  }
  hitTestSelection(T) {
    if (T.x < 0 || T.y < 0 || T.x >= this.size.width || T.y >= this.size.height) return null;
    let R = this.getOffsetForPosition(T.x, T.y);
    return R !== null ? {
      offset: R
    } : null;
  }
  nearestCaretPosition(T) {
    let R = Math.max(0, Math.min(T.x, this.size.width)),
      a = Math.max(0, Math.min(T.y, this.size.height - 1)),
      e = this.getOffsetForPosition(R, a);
    if (e === null) {
      let t = Math.floor(a),
        r = this._visualLines.find(h => h.y === t);
      if (r) e = r.end + 1;else e = 0;
    }
    return {
      offset: e
    };
  }
  wordBoundary(T) {
    let R = this.plainText,
      a = Math.max(0, Math.min(T.offset, R.length)),
      e = a,
      t = a;
    while (e > 0) {
      let r = R[e - 1];
      if (!r || !/\w/.test(r)) break;
      e--;
    }
    while (t < R.length) {
      let r = R[t];
      if (!r || !/\w/.test(r)) break;
      t++;
    }
    if (e === t) t = Math.min(a + 1, R.length);
    return {
      start: e,
      end: t
    };
  }
  lineBoundary(T) {
    let R = this.plainText,
      a = Math.max(0, Math.min(T.offset, R.length)),
      e = 0,
      t = R.length;
    for (let r = a - 1; r >= 0; r--) if (R[r] === `
`) {
      e = r + 1;
      break;
    }
    for (let r = a; r < R.length; r++) if (R[r] === `
`) {
      t = r;
      break;
    }
    return {
      start: e,
      end: t
    };
  }
  paragraphBoundary(T) {
    let R = this.plainText,
      a = Math.max(0, Math.min(T.offset, R.length)),
      e = 0,
      t = R.length;
    for (let r = a - 1; r > 0; r--) if (R[r] === `
` && R[r - 1] === `
`) {
      e = r + 1;
      break;
    }
    for (let r = a; r < R.length - 1; r++) if (R[r] === `
` && R[r + 1] === `
`) {
      t = r;
      break;
    }
    return {
      start: e,
      end: t
    };
  }
  getSelectionContext() {
    return this.plainText.includes(`
`) ? "paragraph" : "line";
  }
  textLength() {
    return this.plainText.length;
  }
  getText(T) {
    let R = this.plainText;
    if (!T) return R;
    let a = Math.max(0, Math.min(T.start, R.length)),
      e = Math.max(a, Math.min(T.end, R.length));
    return R.slice(a, e);
  }
  setSelectedRanges(T) {
    if (!this._rangesEqual(this._selectedRanges, T)) if (this._selectedRanges = T, T.length > 0) {
      let R = T[0];
      if (R) this.updateSelection(R.start, R.end, "selection");else this.updateSelection(null, null, "selection");
    } else this.updateSelection(null, null, "selection");
  }
  _rangesEqual(T, R) {
    if (T.length !== R.length) return !1;
    for (let a = 0; a < T.length; a++) {
      let e = T[a],
        t = R[a];
      if (!e || !t || e.start !== t.start || e.end !== t.end) return !1;
    }
    return !0;
  }
  dispose() {
    this._text = new G(""), this._cachedStyledCells = void 0, this._characterPositions = [], this._visualLines = [], this._selectionStart = null, this._selectionEnd = null, super.dispose();
  }
};
zm = class zm extends Zx {
  _screen;
  _clipX;
  _clipY;
  _clipWidth;
  _clipHeight;
  constructor(T, R, a, e, t) {
    super(e, t);
    this._screen = T, this._clipX = R, this._clipY = a, this._clipWidth = e, this._clipHeight = t;
  }
  setChar(T, R, a, e, t = 1) {
    if (T >= this._clipX && T < this._clipX + this._clipWidth && R >= this._clipY && R < this._clipY + this._clipHeight) this._screen.setChar(T, R, a, e || {}, t);
  }
  setCell(T, R, a) {
    if (T >= this._clipX && T < this._clipX + this._clipWidth && R >= this._clipY && R < this._clipY + this._clipHeight) this._screen.setCell(T, R, a);
  }
  mergeBorderChar(T, R, a, e) {
    if (T >= this._clipX && T < this._clipX + this._clipWidth && R >= this._clipY && R < this._clipY + this._clipHeight) this._screen.mergeBorderChar(T, R, a, e);
  }
  fill(T, R, a, e, t = " ", r) {
    let h = Math.max(T, this._clipX),
      i = Math.max(R, this._clipY),
      c = Math.min(T + a, this._clipX + this._clipWidth),
      s = Math.min(R + e, this._clipY + this._clipHeight);
    if (h < c && i < s) this._screen.fill(h, i, c - h, s - i, t, r);
  }
  getSize() {
    return this._screen.getSize();
  }
  resize(T, R) {
    return this._screen.resize(T, R);
  }
  getBuffer() {
    return this._screen.getBuffer();
  }
  getFrontBuffer() {
    return this._screen.getFrontBuffer();
  }
  getBackBuffer() {
    return this._screen.getBackBuffer();
  }
  getCell(T, R) {
    return this._screen.getCell(T, R);
  }
  clear() {
    return this._screen.clear();
  }
  present() {
    return this._screen.present();
  }
  getDiff() {
    return this._screen.getDiff();
  }
  markForRefresh() {
    return this._screen.markForRefresh();
  }
  setCursor(T, R) {
    if (T >= this._clipX && T < this._clipX + this._clipWidth && R >= this._clipY && R < this._clipY + this._clipHeight) return this._screen.setCursor(T, R);else return this._screen.clearCursor();
  }
  setCursorPositionHint(T, R) {
    if (T >= this._clipX && T < this._clipX + this._clipWidth && R >= this._clipY && R < this._clipY + this._clipHeight) return this._screen.setCursorPositionHint(T, R);
  }
  clearCursor() {
    return this._screen.clearCursor();
  }
  getCursor() {
    return this._screen.getCursor();
  }
  isCursorVisible() {
    return this._screen.isCursorVisible();
  }
  getClipRegion() {
    return {
      x: this._clipX,
      y: this._clipY,
      width: this._clipWidth,
      height: this._clipHeight
    };
  }
};
Fw = class Fw extends B0 {
  text;
  onPressed;
  padding;
  cursor;
  color;
  reverse;
  constructor({
    text: T,
    onPressed: R,
    padding: a,
    cursor: e,
    color: t,
    reverse: r,
    key: h
  }) {
    super({
      key: h
    });
    this.text = T, this.onPressed = R, this.padding = a ?? TR.symmetric(2, 1), this.cursor = e ?? "pointer", this.color = t, this.reverse = r ?? !1;
  }
  build(T) {
    let R = Z0.of(T).colorScheme.background,
      a = this.reverse ? new cT({
        color: R
      }) : this.color ? new cT({
        color: this.color
      }) : void 0,
      e = new xT({
        text: new G(this.text, a)
      }),
      t = new SR({
        padding: this.padding,
        decoration: this.reverse ? new p8(this.color ?? LT.default()) : void 0,
        child: e
      });
    return new G0({
      onClick: async () => {
        await this.onPressed();
      },
      cursor: this.cursor,
      child: t
    });
  }
};
nrT = class nrT extends B0 {
  title;
  subtitle;
  leading;
  trailing;
  selected;
  onTap;
  enabled;
  selectedColor;
  textColor;
  backgroundColor;
  constructor({
    key: T,
    title: R,
    subtitle: a,
    leading: e,
    trailing: t,
    selected: r = !1,
    onTap: h,
    enabled: i = !0,
    selectedColor: c,
    textColor: s,
    backgroundColor: A
  }) {
    super({
      key: T
    });
    this.title = R, this.subtitle = a, this.leading = e, this.trailing = t, this.selected = r, this.onTap = h, this.enabled = i, this.selectedColor = c ?? LT.default(), this.textColor = s ?? LT.default(), this.backgroundColor = A;
  }
  build(T) {
    let R = Z0.of(T).colorScheme,
      a = this.textColor ?? R.foreground,
      e = this.selectedColor ?? R.primary,
      t = this.selected ? e : a,
      r = R.mutedForeground,
      h = new xT({
        text: new G(this.title, new cT({
          color: t,
          bold: this.selected
        })),
        maxLines: 1,
        overflow: "ellipsis"
      }),
      i = this.selected ? new T0({
        mainAxisAlignment: "start",
        crossAxisAlignment: "center",
        children: [new xT({
          text: new G("\u2023", new cT({
            color: t,
            bold: this.selected
          }))
        }), new XT({
          width: 1
        }), new j0({
          child: h
        })]
      }) : new T0({
        mainAxisAlignment: "start",
        crossAxisAlignment: "center",
        children: [new XT({
          width: 2
        }), new j0({
          child: h
        })]
      }),
      c;
    if (this.subtitle) c = new xR({
      crossAxisAlignment: "start",
      mainAxisSize: "min",
      children: [i, new XT({
        height: 0
      }), new T0({
        mainAxisAlignment: "start",
        crossAxisAlignment: "center",
        children: [new XT({
          width: 2
        }), new j0({
          child: new xT({
            text: new G(this.subtitle, new cT({
              color: r
            })),
            maxLines: 1,
            overflow: "ellipsis"
          })
        })]
      })]
    });else c = i;
    let s = [];
    if (this.leading) s.push(this.leading), s.push(new XT({
      width: 1
    }));
    if (s.push(new j0({
      child: c
    })), this.trailing) s.push(new XT({
      width: 1
    })), s.push(this.trailing);
    let A = new T0({
        crossAxisAlignment: "start",
        children: s
      }),
      l = A;
    if (this.backgroundColor) l = new SR({
      child: A,
      decoration: {
        color: this.backgroundColor
      }
    });
    if (this.onTap && this.enabled) return new G0({
      onClick: o => {
        if (this.enabled) this.onTap?.();
      },
      cursor: "pointer",
      child: l
    });
    return l;
  }
};
Z3 = class Z3 extends B0 {
  markdown;
  textAlign;
  maxLines;
  overflow;
  styleScheme;
  colorTransform;
  constructor({
    key: T,
    markdown: R,
    textAlign: a = "left",
    maxLines: e,
    overflow: t = "clip",
    styleScheme: r,
    colorTransform: h
  }) {
    super(T ? {
      key: T
    } : {});
    this.markdown = R, this.textAlign = a, this.maxLines = e, this.overflow = t, this.styleScheme = r, this.colorTransform = h;
  }
  build(T) {
    let R = $R.of(T),
      a = this.styleScheme ?? {
        text: new cT({
          color: R.app.assistantMessage
        }),
        inlineCode: new cT({
          color: R.app.inlineCode,
          bold: !0
        }),
        codeBlock: new cT({
          color: R.app.codeBlock
        }),
        tableBorder: R.app.tableBorder,
        link: new cT({
          color: R.app.link,
          underline: !0
        }),
        syntaxHighlight: R.app.syntaxHighlight
      },
      e = this.key ? `${this.key.toString()}-` : void 0,
      t = {
        styleScheme: a,
        fallbackColor: a.text.color ?? R.colors.foreground,
        colors: R.colors,
        onLinkClick: this.resolveOnLinkClick(T),
        nextHyperlinkIndex: 0
      },
      r;
    try {
      let h = aE0.parse(this.markdown);
      r = this.processAstNode(T, h, t, e);
    } catch {
      let h = a,
        i = new G(this.markdown, h.text),
        c = e ? new k3(`${e}fallback`) : void 0;
      r = [new xT({
        key: c,
        text: i,
        selectable: !0
      })];
    }
    return new xR({
      crossAxisAlignment: "start",
      children: r
    });
  }
  applyColorTransform(T, R, a) {
    if (!this.colorTransform || R === void 0) return T;
    let e = T.color ?? a,
      t = this.colorTransform(R, e);
    return T.copyWith({
      color: t
    });
  }
  resolveOnLinkClick(T) {
    return R => je(T, R);
  }
  hasBlankLineBetween(T, R) {
    let a = T.position?.end?.line,
      e = R.position?.start?.line;
    if (a === void 0 || e === void 0) return !1;
    return e > a + 1;
  }
  processAstNode(T, R, a, e, t = 0, r) {
    let {
        styleScheme: h,
        colors: i
      } = a,
      c = [],
      s = 0;
    switch (R.type) {
      case "root":
        {
          let A = R;
          for (let l = 0; l < A.children.length; l++) {
            let o = A.children[l];
            if (o) {
              c.push(...this.processAstNode(T, o, a, e, t));
              let n = A.children[l + 1];
              if (n && this.hasBlankLineBetween(o, n)) c.push(new xT({
                text: new G(`
`, h.text),
                selectable: !0
              }));
            }
          }
          break;
        }
      case "paragraph":
        {
          let A = R,
            l = this.processInline(T, A.children, a),
            o = l.length === 1 && l[0] ? l[0] : new G(void 0, h.text, l),
            n = e ? new k3(`${e}p-${s++}`) : void 0;
          c.push(new xT({
            key: n,
            text: o,
            selectable: !0
          }));
          break;
        }
      case "heading":
        {
          let A = R,
            l = A.depth,
            o = {
              1: i.primary,
              2: i.secondary,
              3: i.primary,
              4: i.secondary,
              5: h.text.color ?? i.foreground,
              6: h.text.color ?? i.foreground
            }[l],
            n = l <= 2,
            p = h.text.copyWith({
              color: o,
              bold: n
            }),
            _ = this.processInline(T, A.children, a, p),
            m = _.length === 1 && _[0] ? _[0] : new G(void 0, p, _),
            b = e ? new k3(`${e}h${l}-${s++}`) : void 0;
          c.push(new xT({
            key: b,
            text: m,
            selectable: !0
          }));
          break;
        }
      case "blockquote":
        {
          let A = R,
            l = [];
          for (let n of A.children) l.push(...this.processAstNode(T, n, a, e, t));
          let o = new SR({
            padding: TR.only({
              left: 2,
              right: 4
            }),
            child: new SR({
              padding: TR.only({
                left: 1
              }),
              decoration: new p8(void 0, new h9(void 0, void 0, void 0, new e9(i.border, 1))),
              child: new xR({
                crossAxisAlignment: "start",
                children: l
              })
            })
          });
          c.push(o);
          break;
        }
      case "thematicBreak":
        {
          let A = new G("---", h.text);
          c.push(new xT({
            text: A,
            selectable: !0
          }));
          break;
        }
      case "html":
        {
          let A = R,
            l = this.processHtmlNode(T, A.value, a);
          c.push(...l);
          break;
        }
      case "list":
        {
          let A = R,
            l = [],
            o = A.start ?? 1;
          for (let p = 0; p < A.children.length; p++) {
            let _ = A.children[p];
            if (!_) continue;
            let m = {
              ordered: A.ordered ?? !1,
              itemIndex: o + p
            };
            l.push(...this.processAstNode(T, _, a, e, t, m));
          }
          let n = new xR({
            crossAxisAlignment: "start",
            children: l
          });
          if (t > 0) {
            let p = t * 2;
            c.push(new SR({
              padding: TR.only({
                left: p
              }),
              child: n
            }));
          } else c.push(n);
          break;
        }
      case "listItem":
        {
          let A = R,
            l;
          if (typeof A.checked === "boolean") {
            let p = A.checked ? "[\u2713] " : "[ ] ";
            l = new xT({
              text: new G(p, h.text),
              selectable: !1
            });
          } else if (r?.ordered) {
            let p = `${r.itemIndex}. `;
            l = new xT({
              text: new G(p, h.text),
              selectable: !1
            });
          } else l = new xT({
            text: new G("\u2022 ", h.text),
            selectable: !1
          });
          let o = [];
          for (let p = 0; p < A.children.length; p++) {
            let _ = A.children[p];
            if (!_) continue;
            if (_.type === "paragraph") {
              let b = _,
                y = this.processInline(T, b.children, a),
                u = y.length === 1 && y[0] ? y[0] : new G(void 0, h.text, y);
              o.push(new xT({
                text: u,
                selectable: !0
              }));
            } else if (_.type === "list") o.push(...this.processAstNode(T, _, a, e, t + 1));else o.push(...this.processAstNode(T, _, a, e, t));
            let m = A.children[p + 1];
            if (m && this.hasBlankLineBetween(_, m)) o.push(new xT({
              text: new G(`
`, h.text),
              selectable: !0
            }));
          }
          let n = new T0({
            crossAxisAlignment: "start",
            mainAxisAlignment: "start",
            children: [l, new j0({
              child: new xR({
                crossAxisAlignment: "start",
                children: o
              })
            })]
          });
          c.push(n);
          break;
        }
      case "code":
        {
          let A = R,
            l = A.lang || "",
            o = A.value;
          if (o.trim()) {
            let n = tE0(o, l, h.syntaxHighlight, h.codeBlock.color ?? i.foreground, h.codeBlock),
              p = new G(void 0, h.codeBlock, n),
              _ = new SR({
                padding: TR.only({
                  left: 4,
                  right: 4
                }),
                child: new xT({
                  text: p,
                  selectable: !0
                })
              });
            c.push(_);
          }
          break;
        }
      case "table":
        {
          let A = R,
            l = [],
            o = A.children[0],
            n = o ? o.children.length : 0,
            p = Array.from({
              length: n
            }, (m, b) => {
              let y = A.align?.[b],
                u = (() => {
                  switch (y) {
                    case "center":
                      return "center";
                    case "right":
                      return "right";
                    case "left":
                    default:
                      return "left";
                  }
                })();
              return rIT(u, "proportional");
            });
          for (let m = 0; m < A.children.length; m++) {
            let b = A.children[m];
            if (!b) continue;
            let y = b.children.map((P, k) => {
                let x = this.processInline(T, P.children, a),
                  f = x.length === 1 && x[0] ? x[0] : new G(void 0, h.text, x),
                  v = p[k],
                  g = (() => {
                    switch (v?.alignment) {
                      case "center":
                        return "center";
                      case "right":
                        return "right";
                      case "left":
                      default:
                        return "left";
                    }
                  })(),
                  I = new xT({
                    text: f,
                    selectable: !0,
                    textAlign: g
                  });
                return eIT(I);
              }),
              u = m === 0;
            l.push(tIT(y, u));
          }
          let _ = new JY({
            rows: l,
            columnConfigs: p,
            borderColor: h.tableBorder,
            showBorders: !0
          });
          c.push(_);
          break;
        }
      case "tableRow":
      case "tableCell":
        break;
      case "image":
        {
          let A = R.alt || "Image",
            l = new xT({
              text: new G(`[Image: ${A}]`, h.link.copyWith({
                italic: !0
              })),
              selectable: !0
            });
          c.push(l);
          break;
        }
      default:
        {
          if ("children" in R && Array.isArray(R.children)) {
            let A = R;
            for (let l of A.children) c.push(...this.processAstNode(T, l, a, e, t));
          }
          break;
        }
    }
    return c;
  }
  processInline(T, R, a, e) {
    let {
        styleScheme: t,
        onLinkClick: r,
        fallbackColor: h
      } = a,
      i = [],
      c = e ?? t.text;
    for (let s of R) switch (s.type) {
      case "text":
        {
          let A = s,
            l = A.position?.start?.offset,
            o = this.applyColorTransform(c, l, h);
          i.push(new G(A.value, o));
          break;
        }
      case "strong":
        {
          let A = s,
            l = c.copyWith({
              bold: !0
            });
          i.push(...this.processInline(T, A.children, a, l));
          break;
        }
      case "emphasis":
        {
          let A = s,
            l = c.copyWith({
              italic: !0
            });
          i.push(...this.processInline(T, A.children, a, l));
          break;
        }
      case "delete":
        {
          let A = s,
            l = c.copyWith({
              strikethrough: !0
            });
          i.push(...this.processInline(T, A.children, a, l));
          break;
        }
      case "inlineCode":
        {
          let A = s,
            l = A.position?.start?.offset,
            o = this.applyColorTransform(c.merge(t.inlineCode), l, h);
          i.push(new G(A.value, o));
          break;
        }
      case "link":
        {
          let A = s,
            l = c.merge(t.link),
            o = {
              uri: A.url,
              id: eE0(A.url, a.nextHyperlinkIndex++)
            },
            n = this.processInline(T, A.children, a, l);
          for (let p of n) i.push(new G(p.text, p.style, p.children, o, () => {
            r(A.url);
          }));
          break;
        }
      case "break":
        {
          i.push(new G(`
`, c));
          break;
        }
      default:
        {
          if ("children" in s && Array.isArray(s.children)) i.push(...this.processInline(T, s.children, a, e));
          break;
        }
    }
    return i;
  }
  processHtmlNode(T, R, a) {
    try {
      let e = Xg0(R, {
        fragment: !0
      });
      return this.processHastNode(T, e, a);
    } catch {
      let e = new G(R, a.styleScheme.text);
      return [new xT({
        text: e,
        selectable: !0
      })];
    }
  }
  processHastNode(T, R, a) {
    let {
        styleScheme: e
      } = a,
      t = [];
    if (R.type === "root") {
      for (let h of R.children) t.push(...this.processHastNode(T, h, a));
      return t;
    }
    if (R.type === "doctype") return t;
    if (R.type === "text") {
      let h = R;
      if (h.value.trim()) t.push(new xT({
        text: new G(h.value, e.text),
        selectable: !0
      }));
      return t;
    }
    if (R.type !== "element") return t;
    let r = R;
    if (r.tagName === "table") {
      let h = this.processHtmlTable(T, r, e);
      if (h) t.push(h);
      return t;
    }
    for (let h of r.children || []) t.push(...this.processHastNode(T, h, a));
    return t;
  }
  processHtmlTable(T, R, a) {
    let e = [],
      t = 0,
      r = (i, c) => {
        let s = [];
        for (let A of i.children || []) {
          if (A.type !== "element") continue;
          let l = A;
          if (l.tagName !== "td" && l.tagName !== "th") continue;
          let o = this.extractTextFromHast(l),
            n = new xT({
              text: new G(o, a.text),
              selectable: !0
            });
          s.push(eIT(n));
        }
        if (s.length === 0) return null;
        return t = Math.max(t, s.length), tIT(s, c);
      };
    for (let i of R.children || []) {
      if (i.type !== "element") continue;
      let c = i;
      if (c.tagName === "tr") {
        let s = r(c, e.length === 0);
        if (s) e.push(s);
      } else if (c.tagName === "thead" || c.tagName === "tbody") {
        let s = c.tagName === "thead";
        for (let A of c.children || []) {
          if (A.type !== "element") continue;
          let l = A;
          if (l.tagName === "tr") {
            let o = r(l, s && e.length === 0);
            if (o) e.push(o);
          }
        }
      }
    }
    if (e.length === 0) return null;
    let h = Array.from({
      length: t
    }, () => rIT("left", "proportional"));
    return new JY({
      rows: e,
      columnConfigs: h,
      borderColor: a.tableBorder,
      showBorders: !0
    });
  }
  extractTextFromHast(T) {
    if (T.type === "text") return T.value;
    if (T.type === "element") return (T.children || []).map(R => this.extractTextFromHast(R)).join("");
    return "";
  }
};
rZT = class rZT extends wR {
  scrollController = new Q3();
  threadControllerUnsubscription;
  initState() {
    this.setupThreadController(this.widget.threadController);
  }
  didUpdateWidget(T) {
    if (T.threadController !== this.widget.threadController) this.cleanupThreadController(T.threadController), this.setupThreadController(this.widget.threadController);
  }
  dispose() {
    this.cleanupThreadController(this.widget.threadController), this.scrollController.dispose();
  }
  build(T) {
    let R = this.widget.threadController.entries.map((a, e) => new uR({
      padding: TR.horizontal(1),
      child: this.entryToWidget(a, e)
    }));
    return new G1T({
      position: "bottom",
      autofocus: !1,
      controller: this.scrollController,
      children: R,
      itemSpacing: 1,
      enableSelection: !0,
      onCopy: this.widget.onCopy,
      showScrollbar: !0
    });
  }
  entryToWidget(T, R) {
    switch (T.type) {
      case "message":
        if (T.role === "user") return new eZT({
          message: T,
          onShowImagePreview: () => {},
          isSelected: R === this.widget.threadController.selectedMessageIndex
        });
        return new TZT({
          message: T
        });
      case "tool":
        return new RZT({
          tool: T.tool
        });
      case "activity-group":
        return new X1T({
          group: T
        });
    }
  }
  setupThreadController(T) {
    T.onSelectionChange = this.onSelectionChange, this.threadControllerUnsubscription = T.subscribe(this.onThreadControllerUpdate);
  }
  cleanupThreadController(T) {
    T.dispose(), this.threadControllerUnsubscription?.();
  }
  onSelectionChange = T => {
    if (T !== null) this.scrollController.animateTo(T, 150);else this.scrollController.animateToBottom(150);
  };
  onThreadControllerUpdate = () => {
    if (!this.mounted) return;
    this.setState();
  };
};
xS = class xS extends NR {
  props;
  constructor(T = {}) {
    super();
    this.props = T;
  }
  static of(T) {
    let R = T.findAncestorStateOfType(hQ);
    if (R) return R;
    throw Error("Overlay.of() called with a context that does not contain an Overlay widget");
  }
  createState() {
    return new hQ();
  }
};
prT = class prT extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  static rowText(T) {
    return T.queuedMessage.content.filter(wlR).map(R => R.text).join(" ").trim();
  }
  static panelHeight(T) {
    return T.length + 2;
  }
  build(T) {
    let {
        queuedMessages: R
      } = this.props,
      a = Z0.of(T),
      e = R.map(t => prT.rowText(t));
    return new SR({
      decoration: {
        border: h9.all(new e9(a.colorScheme.border, 1, "rounded"))
      },
      child: new uR({
        padding: TR.horizontal(1),
        child: new xR({
          mainAxisSize: "max",
          crossAxisAlignment: "stretch",
          children: e.map(t => new xT({
            text: new G("", void 0, [new G("QUEUED ", new cT({
              color: a.colorScheme.mutedForeground,
              dim: !0
            })), new G(t, new cT({
              color: a.colorScheme.mutedForeground
            }))]),
            maxLines: 1,
            overflow: "ellipsis"
          }))
        })
      })
    });
  }
};
_rT = class _rT extends B0 {
  props;
  constructor(T) {
    super();
    this.props = T;
  }
  onSubmitted = T => {
    let R = T.trim();
    if (R.length === 0) return;
    this.props.onSubmit([{
      type: "text",
      text: R
    }]), this.props.editorController.clear();
  };
  build(T) {
    let {
        child: R,
        editorController: a,
        hints: e,
        agentState: t,
        agentMode: r,
        queuedMessages: h,
        statusMessageOverride: i
      } = this.props,
      c = I9.of(T),
      {
        width: s,
        height: A
      } = c.size,
      l = new Map([[x0.key("ArrowUp"), new ztT()], [x0.key("ArrowDown"), new qtT()]]);
    return new kc({
      shortcuts: l,
      child: new xS({
        child: new SR({
          constraints: o0.tight(s, A),
          child: new xR({
            mainAxisSize: "max",
            crossAxisAlignment: "stretch",
            children: [new j0({
              child: R
            }), new XT({
              height: 1,
              child: new T0({
                mainAxisAlignment: "end",
                children: [y3.flexible(), new uR({
                  padding: TR.horizontal(1),
                  child: new nZT({
                    agentMode: r
                  })
                })]
              })
            }), new OZT({
              editorController: a,
              queuedMessages: h,
              maxBodyRows: Math.floor(c.size.height / 3),
              onSubmitted: this.onSubmitted
            }), new XT({
              width: s,
              height: 1,
              child: new IZT({
                hints: e,
                agentLoopState: t,
                statusMessageOverride: i
              })
            })]
          })
        })
      })
    });
  }
};
wZT = class wZT extends NR {
  child;
  onContext;
  constructor(T, R) {
    super();
    this.child = T, this.onContext = R;
  }
  createState() {
    return new BZT();
  }
};
H3 = class H3 extends B0 {
  uri;
  text;
  style;
  maxLines;
  overflow;
  constructor({
    uri: T,
    text: R,
    style: a,
    maxLines: e,
    overflow: t,
    key: r
  }) {
    super({
      key: r
    });
    this.uri = T, this.text = R, this.style = a, this.maxLines = e, this.overflow = t;
  }
  build(T) {
    return H3.createWidget(T, this.uri, this.text, this.style, this.maxLines, this.overflow);
  }
  static createWidget(T, R, a, e, t, r) {
    let h = new xT({
        text: H3.createSpan(R, a, e),
        selectable: !0,
        maxLines: t,
        overflow: r
      }),
      i = VH.of(T);
    return new G0({
      onClick: c => {
        let s = c.modifiers.ctrl || c.modifiers.meta;
        je(T, R, {
          forceExternal: s,
          onShowImagePreview: i
        });
      },
      cursor: "pointer",
      child: h
    });
  }
  static createSpan(T, R, a) {
    let e = ji(),
      t = e ? T : R,
      r = e ? new cT({
        color: a?.color,
        dim: !0
      }) : a || new cT({
        underline: !0
      }),
      h = e ? void 0 : QVT(T);
    return new G(t, r, void 0, h);
  }
};
oQ = class oQ extends to {
  text;
  baseColor;
  backgroundColor;
  glow;
  time;
  agentMode;
  orbWidth;
  orbHeight;
  glowIntensity;
  shockwaves;
  constructor({
    key: T,
    text: R,
    baseColor: a,
    backgroundColor: e,
    glow: t,
    time: r,
    agentMode: h,
    orbWidth: i = 40,
    orbHeight: c = 40,
    glowIntensity: s = 0.4,
    shockwaves: A = []
  }) {
    super(T ? {
      key: T
    } : {});
    this.text = R, this.baseColor = a, this.backgroundColor = e, this.glow = t, this.time = r, this.agentMode = h, this.orbWidth = i, this.orbHeight = c, this.glowIntensity = s, this.shockwaves = A;
  }
  createElement() {
    return new bp(this);
  }
  createRenderObject() {
    return new GZT(this.text, this.baseColor, this.backgroundColor, this.glow, this.time, this.agentMode, this.orbWidth, this.orbHeight, this.glowIntensity, this.shockwaves);
  }
  updateRenderObject(T) {
    T.update(this.text, this.baseColor, this.backgroundColor, this.glow, this.time, this.agentMode, this.orbWidth, this.orbHeight, this.glowIntensity, this.shockwaves);
  }
};
GZT = class GZT extends O9 {
  _text;
  _baseColor;
  _backgroundColor;
  _glow;
  _time;
  _agentMode;
  _orbWidth;
  _orbHeight;
  _glowIntensity;
  _shockwaves;
  constructor(T, R, a, e, t, r, h, i, c, s) {
    super();
    this._text = T, this._baseColor = R, this._backgroundColor = a, this._glow = e, this._time = t, this._agentMode = r, this._orbWidth = h, this._orbHeight = i, this._glowIntensity = c, this._shockwaves = s;
  }
  update(T, R, a, e, t, r, h, i, c, s) {
    let A = T !== this._text;
    if (this._text = T, this._baseColor = R, this._backgroundColor = a, this._glow = e, this._time = t, this._agentMode = r, this._orbWidth = h, this._orbHeight = i, this._glowIntensity = c, this._shockwaves = s, A) this.markNeedsLayout();
    this.markNeedsPaint();
  }
  getMinIntrinsicWidth(T) {
    return q8(this._text, !1);
  }
  getMaxIntrinsicWidth(T) {
    return q8(this._text, !1);
  }
  getMinIntrinsicHeight(T) {
    return 1;
  }
  getMaxIntrinsicHeight(T) {
    return 1;
  }
  performLayout() {
    let T = this._lastConstraints;
    e8(!!T, "performLayout called without constraints");
    let R = q8(this._text, !1),
      a = T.constrain(R, 1);
    this.setSize(a.width, a.height), super.performLayout();
  }
  paint(T, R = 0, a = 0) {
    let e = R + this.offset.x,
      t = a + this.offset.y,
      r = B9(this._text),
      h = this._agentMode === "rush" ? 2.5 : 1,
      {
        primary: i,
        secondary: c
      } = _XT(this._agentMode),
      s = e;
    for (let A = 0; A < r.length; A++) {
      let l = r[A],
        o = J8(l, !1),
        n = (1 - A / Math.max(r.length - 1, 1) * 0.7) ** 1.2,
        p = this._glow.sample(this._orbWidth - 2 + A * 0.5, this._orbHeight / 2, this._time, h),
        _ = 0;
      for (let u of this._shockwaves) {
        let P = this._time - u.startTime;
        if (P < 0 || P > Yk) continue;
        let k = this._orbWidth * 0.7 + A,
          x = this._orbHeight / 2,
          f = k - u.x,
          v = (x - u.y) / aC0,
          g = Math.sqrt(f * f + v * v),
          I = P * mXT,
          S = Math.abs(g - I);
        if (S < iP) {
          let O = 1 - P / Yk,
            j = (1 - S / iP) * O;
          _ = Math.max(_, j * 0.6);
        }
      }
      let m = p ** 0.7,
        b = Math.min(1, m * n + _),
        y = this.blendWithGlow(this._baseColor, b, i, c);
      T.setCell(s, t, {
        char: l,
        width: o,
        style: {
          fg: y,
          bg: this._backgroundColor
        }
      }), s += o;
    }
  }
  blendWithGlow(T, R, a, e) {
    let t = pXT(a, e, R),
      r = R * this._glowIntensity;
    if (T.type === "rgb") {
      let h = T.value,
        i = Math.round(h.r * (1 - r) + t.r * r),
        c = Math.round(h.g * (1 - r) + t.g * r),
        s = Math.round(h.b * (1 - r) + t.b * r);
      return {
        type: "rgb",
        value: {
          r: i,
          g: c,
          b: s
        }
      };
    }
    if (r > 0.15) return {
      type: "rgb",
      value: {
        r: t.r,
        g: t.g,
        b: t.b
      }
    };
    return T;
  }
};
sRR = class sRR extends wR {
  animationFrame = 0;
  animationTimer = null;
  animationFrames = [" ", "\u223C", "\u2248", "\u224B", "\u2248", "\u223C"];
  initState() {
    this.startAnimationIfNeeded();
  }
  didUpdateWidget(T) {
    this.startAnimationIfNeeded();
  }
  dispose() {
    this.stopAnimation();
  }
  startAnimationIfNeeded() {
    let T = this.shouldShowSpinner();
    if (T && !this.animationTimer) this.startAnimation();else if (!T && this.animationTimer) this.stopAnimation();
  }
  startAnimation() {
    if (this.animationTimer) return;
    this.animationTimer = setInterval(() => {
      this.setState(() => {
        this.animationFrame = (this.animationFrame + 1) % this.animationFrames.length;
      });
    }, 200);
  }
  stopAnimation() {
    if (this.animationTimer) clearInterval(this.animationTimer), this.animationTimer = null;
  }
  shouldShowSpinner() {
    let {
      compactionState: T,
      threadViewState: R,
      submittingPromptMessage: a,
      waitingForConfirmation: e,
      runningBashInvocations: t
    } = this.widget;
    return Boolean(a || T === "compacting" || t || R && R.state === "active" && (R.inferenceState === "running" || R.interactionState === "tool-running") && !this.isShowingTokenUsageNote() && !e);
  }
  isShowingTokenUsageNote() {
    return yB(this.widget).type === "context-warning";
  }
  getSpinnerColor(T) {
    let {
      threadViewState: R,
      submittingPromptMessage: a
    } = this.widget;
    if (a) return T.colors.primary;
    if (!R) return T.colors.mutedForeground;
    if (R.state === "active") {
      if (R.inferenceState === "running") return T.colors.primary;
    }
    return T.colors.mutedForeground;
  }
  getThresholdColor(T, R, a) {
    switch (a) {
      case "recommendation":
        return R.recommendation;
      case "warning":
        return T.warning;
      case "danger":
        return T.destructive;
    }
  }
  build(T) {
    let R = $R.of(T),
      a = R.colors,
      e = R.app,
      t = yB(this.widget);
    if (t.type === "none") return new XT({
      width: 0,
      height: 0
    });
    let r = [];
    if (this.shouldShowSpinner()) {
      let h = this.animationFrames[this.animationFrame];
      r.push(new xT({
        text: new G(h, new cT({
          color: this.getSpinnerColor(R)
        })),
        maxLines: 1
      })), r.push(y3.horizontal(1));
    }
    switch (t.type) {
      case "executing":
        {
          let h = new cT({
              color: a.foreground,
              dim: !0
            }),
            i = new cT({
              color: e.command
            }),
            c = t.noun && t.verb ? `${t.noun}: ${t.verb}` : t.command;
          r.push(new xT({
            text: new G("", void 0, [new G("Executing ", h), new G(c, i), new G("...", h)]),
            textAlign: "left",
            maxLines: 1,
            overflow: "clip"
          }));
          break;
        }
      case "executing-message":
        {
          r.push(new xT({
            text: new G(t.message, new cT({
              color: e.command
            })),
            textAlign: "left",
            maxLines: 1,
            overflow: "clip"
          }));
          break;
        }
      case "context-warning":
        {
          let h = this.getThresholdColor(a, e, t.threshold),
            i = new cT({
              color: h
            }),
            c = new cT({
              color: a.foreground
            }),
            s = new cT({
              color: e.command
            });
          r.push(new xT({
            text: new G("", void 0, [new G(`${t.prefix} `, i), new G("Use ", c), new G("thread:handoff", s), new G(" or ", c), new G("thread:new", s), new G(" to continue in a new thread.", c)]),
            textAlign: "left",
            maxLines: 1,
            overflow: "clip"
          }));
          break;
        }
      case "simple":
        {
          let h = XN0(t.message);
          r.push(new xT({
            text: new G(h, new cT({
              color: a.foreground,
              italic: t.italic
            })),
            textAlign: "left",
            maxLines: 1,
            overflow: "clip"
          }));
          break;
        }
    }
    return new T0({
      children: r,
      mainAxisSize: "min"
    });
  }
};
YrT = class YrT extends B0 {
  leftChild;
  rightChild1;
  rightChild2;
  maxHeight;
  borderColor;
  backgroundColor;
  borderStyle;
  overlayTexts;
  overlayLayer;
  hasBanner;
  userHeight;
  onDrag;
  onDragRelease;
  onInitializeHeight;
  enableResize;
  constructor({
    key: T,
    leftChild: R,
    rightChild1: a,
    rightChild2: e,
    maxHeight: t,
    borderColor: r,
    backgroundColor: h,
    borderStyle: i = "rounded",
    overlayTexts: c = [],
    overlayLayer: s = null,
    hasBanner: A = !1,
    userHeight: l,
    onDrag: o,
    onDragRelease: n,
    onInitializeHeight: p,
    enableResize: _ = !0
  }) {
    super({
      key: T
    });
    this.leftChild = R, this.rightChild1 = a, this.rightChild2 = e, this.maxHeight = t, this.borderColor = r, this.backgroundColor = h, this.borderStyle = i, this.overlayTexts = c, this.overlayLayer = s, this.hasBanner = A, this.userHeight = l, this.onDrag = o, this.onDragRelease = n, this.onInitializeHeight = p, this.enableResize = _;
  }
  build(T) {
    let R = YrT._toBorderTextOverlays(this.overlayTexts),
      a = Z0.of(T),
      e = this.borderColor ?? a.colorScheme.border,
      t = this.backgroundColor ?? a.colorScheme.background;
    return new Rt({
      overlays: R,
      overlayGroupSpacing: 2,
      child: new Ta({
        children: [new pRR({
          children: [new uR({
            padding: TR.symmetric(1, 0),
            child: this.leftChild
          }), ...(this.rightChild1 ? [this.rightChild1] : []), ...(this.rightChild2 ? [this.rightChild2] : [])],
          maxHeight: this.maxHeight,
          borderColor: e,
          backgroundColor: t,
          borderStyle: this.borderStyle,
          hasBanner: this.hasBanner,
          userHeight: this.userHeight
        }), ...(this.overlayLayer ? [this.overlayLayer] : []), ...(this.enableResize ? [new ca({
          top: 0,
          left: 0,
          right: 0,
          child: new G0({
            child: new XT({
              height: 1
            }),
            cursor: B3.NS_RESIZE,
            onDrag: r => {
              if (this.userHeight === void 0 && this.onInitializeHeight) {
                let h = T.findRenderObject()?.size.height ?? 0;
                if (h > 0) {
                  this.onInitializeHeight(h);
                  return;
                }
              }
              this.onDrag?.(r);
            },
            onRelease: this.onDragRelease
          })
        })] : [])]
      })
    });
  }
  static _toBorderTextOverlays(T) {
    return T.map(R => {
      switch (R.position) {
        case "top-left":
          return {
            child: R.child,
            position: "top",
            alignment: "left",
            offsetX: R.offsetX
          };
        case "top-right":
          return {
            child: R.child,
            position: "top",
            alignment: "right",
            offsetX: R.offsetX
          };
        case "bottom-left":
          return {
            child: R.child,
            position: "bottom",
            alignment: "left",
            offsetX: R.offsetX
          };
        case "bottom-right":
          return {
            child: R.child,
            position: "bottom",
            alignment: "right",
            offsetX: R.offsetX
          };
      }
    });
  }
};
x0R = class x0R extends wR {
  analysis = null;
  error = null;
  isLoading = !0;
  abortController = null;
  progressStep = "";
  progressCurrent = 0;
  progressTotal = 0;
  initState() {
    if (this.widget.initialAnalysis) {
      this.analysis = this.widget.initialAnalysis, this.isLoading = !1;
      return;
    }
    if (this.widget.initialProgress) {
      this.progressStep = this.widget.initialProgress.step, this.progressCurrent = this.widget.initialProgress.current, this.progressTotal = this.widget.initialProgress.total, this.isLoading = !0;
      return;
    }
    this.abortController = new AbortController(), this.loadAnalysis();
  }
  dispose() {
    this.abortController?.abort();
  }
  async loadAnalysis() {
    if (this.widget.dtwAnalyze) {
      try {
        let T = await this.widget.dtwAnalyze(this.abortController?.signal);
        if (this.mounted) this.analysis = T, this.isLoading = !1, this.setState();
      } catch (T) {
        if (this.mounted) this.error = T instanceof Error ? T.message : "Unknown error", this.isLoading = !1, this.setState();
      }
      return;
    }
    if (!this.widget.deps || !this.widget.thread) {
      this.error = "Missing deps or thread", this.isLoading = !1, this.setState();
      return;
    }
    try {
      let T = await m0(ln(this.widget.deps.configService).pipe(da(e => e !== "pending")), this.abortController?.signal),
        R = {
          ...this.widget.deps,
          buildSystemPromptDeps: {
            ...this.widget.deps.buildSystemPromptDeps,
            serverStatus: X9(T) ? T : void 0
          },
          onProgress: (e, t, r) => {
            if (this.mounted) this.progressStep = e, this.progressCurrent = t, this.progressTotal = r, this.setState();
          }
        },
        a = await oFT(R, this.widget.thread, this.abortController?.signal);
      if (this.mounted) this.analysis = a, this.isLoading = !1, this.setState();
    } catch (T) {
      if (this.mounted) this.error = T instanceof Error ? T.message : "Unknown error", this.isLoading = !1, this.setState();
    }
  }
  build(T) {
    let R = Z0.of(T).colorScheme,
      a = I9.of(T),
      e = new cT({
        color: R.primary,
        bold: !0
      }),
      t = new cT({
        color: R.secondary
      }),
      r = new cT({
        color: R.foreground
      }),
      h = new cT({
        color: R.foreground,
        dim: !0
      }),
      i = new cT({
        color: R.destructive
      }),
      c = a.supportsEmojiWidth,
      s = a.size.width,
      A = a.size.height,
      l = s - 4,
      o = A - 4,
      n = Math.max(50, Math.min(70, l)),
      p = Math.max(1, n - 4),
      _ = "",
      m = P => w4(P, p, c, "center"),
      b = (P, k, x, f, v, g, I) => {
        let S = Mw(P, f, c),
          O = w4(S, f + 2, c),
          j = w4(eL(k), 8, c, "right"),
          d = w4(`(${x.toFixed(1)}%)`, 8, c, "right");
        return [new G(`${O}`, v), new G(j, g), new G(` ${d}
`, I)];
      },
      y = [];
    if (this.isLoading) {
      let P = this.progressTotal > 0 ? Math.round(this.progressCurrent / this.progressTotal * 20) : 0,
        k = 20 - P,
        x = `[${"\u2588".repeat(P)}${"\u2591".repeat(k)}] ${this.progressCurrent}/${this.progressTotal}`;
      y.push(new G(`${m(this.progressStep || "Analyzing context tokens...")}
`, t)), y.push(new G(`${m(x)}
`, h));
    } else if (this.error) y.push(new G(`Error: ${this.error}
`, i));else if (this.analysis) {
      y.push(new G(`${m("Context Usage Analysis")}
`, e)), y.push(new G(`
`)), y.push(new G("Model: ", t)), y.push(new G(this.analysis.modelDisplayName, r)), y.push(new G(` (${eL(this.analysis.maxContextTokens)} context)
`, h)), y.push(new G(`
`));
      let P = this.analysis.sections.flatMap(g => [g.name, ...(g.children?.map(I => `  ${I.name}`) ?? [])]),
        k = Math.max(...P.map(g => q8(g, c))),
        x = Math.max(10, p - 21),
        f = Math.min(k, x);
      for (let g of this.analysis.sections) if (y.push(...b(g.name, g.tokens, g.percentage, f, t, r, h)), g.children && g.children.length > 0) for (let I of g.children) y.push(...b(`  ${I.name}`, I.tokens, I.percentage, f, h, h, h));
      y.push(new G(`
`));
      let v = (this.analysis.totalTokens / this.analysis.maxContextTokens * 100).toFixed(1);
      y.push(new G("Used:  ", t)), y.push(new G(`${eL(this.analysis.totalTokens)} tokens`, r)), y.push(new G(` (${v}% used)
`, h)), y.push(new G("Free:  ", t)), y.push(new G(`${eL(this.analysis.freeSpace)} tokens
`, r)), y.push(new G(`
`)), y.push(new G(`${m("Press Escape to close")}
`, t));
    } else y.push(new G(`No analysis available
`, t));
    let u = new xT({
      text: new G("", void 0, y),
      selectable: !0
    });
    return new N0({
      child: new SR({
        constraints: new o0(n, n, 0, o),
        decoration: new p8(R.background, h9.all(new e9(R.primary, 1, "rounded"))),
        child: new uR({
          padding: TR.all(1),
          child: new ro({
            child: u
          })
        })
      })
    });
  }
};
I0R = class I0R extends wR {
  scrollOffset = 0;
  maxScrollOffset = 0;
  contentHeight = 0;
  viewportHeight = 0;
  showExactNumbers = !1;
  formatTokens(T) {
    if (this.showExactNumbers) return T.toLocaleString();
    return XM(T);
  }
  handleKeyEvent = T => {
    switch (T.key) {
      case "Escape":
        return this.widget.onDismiss?.(), "handled";
      case "ArrowUp":
      case "k":
        return this.scroll(-3), "handled";
      case "ArrowDown":
      case "j":
        return this.scroll(3), "handled";
      case "Home":
        return this.scrollToTop(), "handled";
      case "End":
        return this.scrollToBottom(), "handled";
      case "PageUp":
        return this.scroll(-Math.floor(this.viewportHeight * 0.8)), "handled";
      case "PageDown":
        return this.scroll(Math.floor(this.viewportHeight * 0.8)), "handled";
      case "b":
        if (this.widget.onOpenCostBreakdown) return this.widget.onOpenCostBreakdown(), "handled";
        return "ignored";
      case "e":
        return this.showExactNumbers = !this.showExactNumbers, this.setState(() => {}), "handled";
      default:
        return "ignored";
    }
  };
  scroll(T) {
    let R = Math.max(0, Math.min(this.maxScrollOffset, this.scrollOffset + T));
    if (R !== this.scrollOffset) this.scrollOffset = R, this.setState(() => {});
  }
  scrollToTop() {
    if (this.scrollOffset !== 0) this.scrollOffset = 0, this.setState(() => {});
  }
  scrollToBottom() {
    if (this.scrollOffset !== this.maxScrollOffset) this.scrollOffset = this.maxScrollOffset, this.setState(() => {});
  }
  updateScrollBounds(T, R) {
    this.contentHeight = T, this.viewportHeight = R, this.maxScrollOffset = Math.max(0, T - R), this.scrollOffset = Math.max(0, Math.min(this.maxScrollOffset, this.scrollOffset));
  }
  getScrollbarInfo = () => {
    return {
      totalContentHeight: this.contentHeight,
      viewportHeight: this.viewportHeight,
      scrollOffset: this.scrollOffset
    };
  };
  build(T) {
    let R = Z0.of(T).colorScheme,
      a = $R.of(T).app,
      e = BJT(T),
      t = I9.of(T),
      {
        tokenUsage: r
      } = this.widget,
      h = t.size.width,
      i = t.size.height,
      c = h - 4,
      s = i - 4,
      A = Math.max(40, Math.min(60, c)),
      l = new cT({
        color: R.primary,
        bold: !0
      }),
      o = new cT({
        color: R.foreground
      }),
      n = new cT({
        color: R.foreground,
        dim: !0
      }),
      p = new cT({
        color: R.accent
      }),
      _ = new cT({
        color: a.keybind
      }),
      m = new cT({
        color: R.foreground
      }),
      b = [];
    if (r) {
      let O = r.totalInputTokens / r.maxInputTokens * 100,
        j = this.showExactNumbers ? O.toFixed(2) : String(Math.max(0, Math.min(Math.round(O), 100)));
      if (b.push(new G(`Used:    ${this.formatTokens(r.totalInputTokens)} tokens (${j}%)
`, o)), b.push(new G(`Maximum: ${this.formatTokens(r.maxInputTokens)} tokens
`, n)), r.cacheReadInputTokens || r.cacheCreationInputTokens) b.push(new G(`Cached:  ${this.formatTokens(r.cacheReadInputTokens ?? 0)} tokens
`, p));
      b.push(new G(`
`));
    }
    let {
      costInfo: y
    } = this.widget;
    if (e && y?.totalCostUSD !== void 0 && y.totalCostUSD !== null) {
      let O = xrT(y, {
        colors: {
          foreground: R.foreground
        }
      });
      if (O.length > 0) {
        if (b.push(new G(`Thread Cost
`, new cT({
          color: R.accent,
          bold: !0
        }))), b.push(new G("  Total: ", o)), b.push(...O), b.push(new G(`
`)), this.widget.onOpenCostBreakdown) b.push(new G("  Press ", n)), b.push(new G("b", _)), b.push(new G(` to view breakdown
`, n));
      }
    }
    let u = this.widget.costInfo?.entitlement;
    if (u) {
      b.push(new G(`
`)), b.push(new G(`Usage Entitlement
`, new cT({
        color: R.accent,
        bold: !0
      })));
      let O = AP(u.remainingUSD, {
          intent: "balance"
        }),
        j = AP(u.limitUSD, {
          intent: "balance"
        }),
        d = this.showExactNumbers ? u.percentUsed.toFixed(2) : String(Math.round(u.percentUsed)),
        C = g3T(u.windowResetsInSeconds * -1000, {
          future: !0,
          verbose: !0
        });
      b.push(new G(`  ${O} remaining of ${j} ${u.windowPeriod} limit
`, o)), b.push(new G(`  ${d}% used`, n)), b.push(new G(" \xB7 ", n)), b.push(new G(`resets in ${C}
`, n));
    }
    let P = new uR({
        padding: TR.only({
          left: 2,
          right: 2,
          top: 1,
          bottom: 1
        }),
        child: new xT({
          text: new G("Context Window Details", l)
        })
      }),
      k = this.maxScrollOffset > 0,
      x = [new G("Press ", m), new G("Escape", _), new G(" to close", m), new G(" \u2022 ", m), new G("e", _), new G(this.showExactNumbers ? " to show rounded" : " to show exact numbers", m)];
    if (k) x.push(new G(" \u2022 Use ", m), new G("\u2191\u2193", _), new G(" or ", m), new G("j/k", _), new G(" to scroll", m));
    let f = new uR({
        padding: TR.symmetric(0, 1),
        child: new N0({
          child: new xT({
            text: new G(void 0, m, x)
          })
        })
      }),
      v = new C8({
        autofocus: !0,
        onKey: this.handleKeyEvent,
        child: new g0R({
          scrollOffset: this.scrollOffset,
          onMeasured: (O, j) => {
            this.updateScrollBounds(O, j);
          },
          child: new uR({
            padding: TR.symmetric(2, 1),
            child: new xT({
              text: new G("", void 0, b)
            })
          })
        })
      }),
      g = new Oi({
        controller: null,
        getScrollInfo: this.getScrollbarInfo,
        thickness: 1,
        thumbColor: a.scrollbarThumb,
        trackColor: a.scrollbarTrack
      }),
      I = new Ta({
        children: [new uR({
          padding: TR.only({
            right: 1
          }),
          child: v
        }), new ca({
          right: 0,
          top: 0,
          bottom: 0,
          child: new XT({
            width: 1,
            child: g
          })
        })]
      }),
      S = new xR({
        mainAxisSize: "min",
        crossAxisAlignment: "stretch",
        children: [P, I, f]
      });
    return new N0({
      child: new SR({
        constraints: new o0(A, A, 0, s),
        decoration: {
          color: R.background,
          border: h9.all(new e9(R.primary, 1, "rounded"))
        },
        child: S
      })
    });
  }
};
fp = class fp extends B0 {
  props;
  highlightedLines = new Map();
  cachedDiffLines;
  cachedLineNumDimensions;
  constructor(T) {
    super();
    this.props = T, this.cachedDiffLines = this.parseDiffLines(this.props.diff), this.cachedLineNumDimensions = this.calculateLineNumberDimensions();
  }
  createHighlightedSpan(T, R, a, e, t, r) {
    if (!a) return new G(`${T}${R}`, new cT({
      color: e,
      dim: r
    }));
    let h = t.foreground,
      i = [new G(T, new cT({
        color: e
      }))];
    for (let c of a) i.push(new G(c.content, new cT({
      color: c.color ?? h
    })));
    return new G("", void 0, i);
  }
  build(T) {
    let R = $R.of(T);
    if (this.props.filePath && this.highlightedLines.size === 0) for (let a = 0; a < this.cachedDiffLines.length; a++) {
      let e = this.cachedDiffLines[a];
      if (e.type !== "chunk" && e.content.trim()) try {
        let t = Sv(e.content, R.app.syntaxHighlight, this.props.filePath);
        this.highlightedLines.set(a, t);
      } catch (t) {
        J.error("failed to highlight syntax", t);
      }
    }
    return this.formatUnifiedDiff(R.colors);
  }
  parseDiffLines(T) {
    let R = [],
      a = T.replace(/^`{3,}diff\n|`{3,}$/g, "").split(`
`).filter(i => !i.startsWith("Index:") && !i.startsWith("===") && !i.match(/^--- .*/) && !i.match(/^\+\+\+ .*/)),
      e = this.calculateMinIndentation(a),
      t = a.map(i => {
        if (i.match(/^@@ .* @@/) || !i.trim()) return i;
        let c = i[0],
          s = i.slice(1);
        if (s.length > e) return c + "  " + s.slice(e);
        return i;
      }),
      r = 0,
      h = 0;
    for (let i of t) if (i.match(/^@@ .* @@/)) {
      let c = i.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (c) r = parseInt(c[1], 10), h = parseInt(c[2], 10), R.push({
        type: "chunk",
        content: i
      });
    } else if (i.startsWith("+")) R.push({
      type: "add",
      content: i.slice(1),
      newLineNum: h++
    });else if (i.startsWith("-")) R.push({
      type: "remove",
      content: i.slice(1),
      oldLineNum: r++
    });else R.push({
      type: "context",
      content: i.startsWith(" ") ? i.slice(1) : i,
      oldLineNum: r++,
      newLineNum: h++
    });
    return R;
  }
  formatUnifiedDiff(T) {
    let R = new cT({
        color: T.foreground,
        dim: !0
      }),
      a = Sm0(T.success, T.destructive, T.background),
      e = process.env.TERM_PROGRAM === "Apple_Terminal",
      t = !a,
      r = T.success,
      h = T.destructive,
      i = e ? {
        type: "index",
        value: 52
      } : a?.removed,
      c = e ? {
        type: "index",
        value: 23
      } : a?.added,
      s = [],
      {
        lineNumWidth: A,
        totalWidth: l
      } = this.cachedLineNumDimensions;
    for (let o = 0; o < this.cachedDiffLines.length; o++) {
      let n = this.cachedDiffLines[o],
        p = this.highlightedLines.get(o);
      if (n.type === "chunk") s.push(new xT({
        text: new G("  ...", R),
        selectable: !0
      }));else if (n.type === "add") {
        let _ = n.newLineNum.toString().padStart(A),
          m = this.createHighlightedSpan("+", n.content, t ? void 0 : p, t ? r : T.success, T);
        s.push(new T0({
          crossAxisAlignment: "start",
          children: [new XT({
            width: l,
            child: new xT({
              text: new G(` ${_} `, R)
            })
          }), new j0({
            child: t ? new xT({
              text: m,
              selectable: !0
            }) : new SR({
              decoration: new p8(c),
              child: new xT({
                text: m,
                selectable: !0
              })
            })
          })]
        }));
      } else if (n.type === "remove") {
        let _ = n.oldLineNum.toString().padStart(A),
          m = this.createHighlightedSpan("-", n.content, t ? void 0 : p, t ? h : T.destructive, T);
        s.push(new T0({
          crossAxisAlignment: "start",
          children: [new XT({
            width: l,
            child: new xT({
              text: new G(` ${_} `, R)
            })
          }), new j0({
            child: t ? new xT({
              text: m,
              selectable: !0
            }) : new SR({
              decoration: new p8(i),
              child: new xT({
                text: m,
                selectable: !0
              })
            })
          })]
        }));
      } else {
        let _ = n.newLineNum.toString().padStart(A),
          m = this.createHighlightedSpan(" ", n.content, p, R.color, T, !0);
        s.push(new T0({
          crossAxisAlignment: "start",
          children: [new XT({
            width: l,
            child: new xT({
              text: new G(` ${_} `, R)
            })
          }), new j0({
            child: new xT({
              text: m,
              selectable: !0
            })
          })]
        }));
      }
    }
    return new xR({
      crossAxisAlignment: "start",
      children: s
    });
  }
  calculateMinIndentation(T) {
    let R = Number.POSITIVE_INFINITY;
    for (let a of T) {
      if (a.match(/^@@ .* @@/) || !a.trim()) continue;
      let e = a.slice(1);
      if (!e.trim()) continue;
      let t = e.match(/^[\t ]*/)?.[0].length ?? 0;
      R = Math.min(R, t);
    }
    return R === Number.POSITIVE_INFINITY ? 0 : R;
  }
  calculateLineNumberDimensions() {
    let T = Math.max(0, ...this.cachedDiffLines.map(e => Math.max(e.oldLineNum ?? 0, e.newLineNum ?? 0))),
      R = Math.max(4, String(T).length),
      a = 1 + R + 1;
    return {
      lineNumWidth: R,
      totalWidth: a
    };
  }
};
l8R = class l8R extends NR {
  markdown;
  defaultColor;
  textAlign;
  maxLines;
  overflow;
  constructor({
    key: T,
    markdown: R,
    defaultColor: a,
    textAlign: e = "left",
    maxLines: t,
    overflow: r = "clip"
  }) {
    super(T ? {
      key: T
    } : {});
    this.markdown = R, this.defaultColor = a, this.textAlign = e, this.maxLines = t, this.overflow = r;
  }
  createState() {
    return new A8R();
  }
};
A8R = class A8R extends wR {
  animationOffset = 0;
  isAnimating = !1;
  intervalId;
  animationTimeoutId;
  targetPhrase = "You're absolutely right";
  initState() {
    if (super.initState(), this.widget.markdown.includes(this.targetPhrase)) this.intervalId = setInterval(() => {
      this.startRainbowAnimation();
    }, 3000);
  }
  cleanup = () => {
    if (this.intervalId) clearInterval(this.intervalId), this.intervalId = void 0;
    if (this.animationTimeoutId) clearTimeout(this.animationTimeoutId), this.animationTimeoutId = void 0;
  };
  dispose() {
    this.cleanup(), super.dispose();
  }
  startRainbowAnimation() {
    this.isAnimating = !0, this.animationOffset = 0, this.setState(() => {});
    let T = 60,
      R = 0,
      a = () => {
        if (R < T) this.animationOffset = R / T, this.setState(() => {}), R++, this.animationTimeoutId = setTimeout(a, 33);else this.isAnimating = !1, this.setState(() => {});
      };
    a();
  }
  build(T) {
    let R = $R.of(T);
    if (this.widget.markdown.indexOf(this.targetPhrase) === -1) return new Z3({
      markdown: this.widget.markdown,
      textAlign: this.widget.textAlign,
      maxLines: this.widget.maxLines,
      overflow: this.widget.overflow
    });
    let a = new Z3({
      markdown: this.widget.markdown,
      textAlign: this.widget.textAlign,
      maxLines: this.widget.maxLines,
      overflow: this.widget.overflow
    }).build(T);
    if (!this.isAnimating) return a;
    let e = this.widget.defaultColor ?? R.colors.foreground;
    return this.applyRainbowToWidget(a, e, R);
  }
  applyRainbowToWidget(T, R, a) {
    if (T instanceof xT) {
      let e = this.applyRainbowToTextSpan(T.text, R, a);
      return new xT({
        text: e,
        textAlign: T.textAlign,
        maxLines: T.maxLines,
        overflow: T.overflow
      });
    }
    if ("children" in T && Array.isArray(T.children)) {
      let e = T,
        t = e.children.map(r => this.applyRainbowToWidget(r, R, a));
      return new T.constructor({
        children: t,
        ...(e.mainAxisAlignment !== void 0 && {
          mainAxisAlignment: e.mainAxisAlignment
        }),
        ...(e.crossAxisAlignment !== void 0 && {
          crossAxisAlignment: e.crossAxisAlignment
        }),
        ...(e.mainAxisSize !== void 0 && {
          mainAxisSize: e.mainAxisSize
        }),
        ...(e.crossAxisSize !== void 0 && {
          crossAxisSize: e.crossAxisSize
        })
      });
    }
    return T;
  }
  applyRainbowToTextSpan(T, R, a) {
    if (T.text && T.text.includes(this.targetPhrase)) return this.createRainbowSpansForText(T, R, a);
    if (T.children && T.children.length > 0) {
      let e = T.children.map(t => this.applyRainbowToTextSpan(t, R, a));
      return new G(T.text, T.style, e, T.hyperlink);
    }
    return T;
  }
  getSpanText(T) {
    let R = T.text || "";
    if (T.children) R += T.children.map(a => this.getSpanText(a)).join("");
    return R;
  }
  createRainbowSpansForText(T, R, a) {
    let e = T.text || "",
      t = e.indexOf(this.targetPhrase);
    if (t === -1) return T;
    let r = e.slice(0, t),
      h = e.slice(t + this.targetPhrase.length),
      i = [];
    if (r) i.push(new G(r, T.style || new cT({
      color: R
    })));
    if (i.push(...this.createAnimatedRainbowSpans(T.style || new cT({
      color: R
    }), a)), h) i.push(new G(h, T.style || new cT({
      color: R
    })));
    return new G(void 0, T.style, i, T.hyperlink);
  }
  createAnimatedRainbowSpans(T, R) {
    let {
        colors: a
      } = R,
      e = [T.color ?? a.foreground, a.warning, a.success, a.secondary, a.primary, a.accent],
      t = 8,
      r = this.targetPhrase.replace(/\s/g, "").length,
      h = Math.floor(this.animationOffset * (r + 8)) - 8,
      i = [],
      c = 0;
    for (let s = 0; s < this.targetPhrase.length; s++) {
      let A = this.targetPhrase[s];
      if (A !== " " && A !== "\t" && A !== `
`) {
        if (c >= h && c < h + 8) {
          let l = (c - h) % e.length;
          i.push(new G(A, T.copyWith({
            color: e[l]
          })));
        } else i.push(new G(A, T));
        c++;
      } else i.push(new G(A, T));
    }
    return i;
  }
};
k8R = class k8R extends wR {
  currentShellModeStatus;
  imageAttachments = [];
  get controller() {
    return this.widget.controller;
  }
  initState() {
    this.controller.addListener(this.textChangeListener);
    let T = YP(this.controller.text);
    if (this.currentShellModeStatus = T?.visibility, this.widget.message) {
      let R = this.widget.message.content.filter(a => a.type === "image");
      this.imageAttachments = R;
    }
  }
  dispose() {
    this.controller.removeListener(this.textChangeListener), super.dispose();
  }
  textChangeListener = () => {
    let T = this.controller.text,
      R = YP(T)?.visibility;
    if (R !== this.currentShellModeStatus) this.currentShellModeStatus = R, this.setState(() => {});
  };
  handleSubmit = T => {
    this.widget.onSubmitted(T, this.imageAttachments);
  };
  handleInsertImage = async T => {
    let R = await GH(T);
    if (typeof R === "object") return this.setState(() => {
      this.imageAttachments = [...this.imageAttachments, R];
    }), !1;
    return !1;
  };
  handlePopImage = () => {
    if (this.imageAttachments.length > 0) this.setState(() => {
      this.imageAttachments = this.imageAttachments.slice(0, -1);
    });
  };
  handleImageClick = T => {
    let R = this.imageAttachments[T];
    if (R) this.widget.onShowImagePreview(R, T, () => {
      this.setState(() => {
        this.imageAttachments = this.imageAttachments.filter((a, e) => e !== T);
      });
    });
  };
  build(T) {
    let R = $R.of(T),
      a = R.colors,
      e = R.app,
      t = this.currentShellModeStatus ? MN0(R, this.currentShellModeStatus) : e.selectedMessage,
      r = null,
      h = this.widget.message && ZS(this.widget.message);
    if (h) r = lhT(T, h);
    let i = r ? new uR({
        padding: TR.only({
          top: 1
        }),
        child: r
      }) : void 0,
      c = new Td({
        controller: this.controller,
        triggers: [new ef()],
        bottomWidget: i,
        completionBuilder: this.widget.completionBuilder,
        onSubmitted: this.handleSubmit,
        theme: a,
        placeholder: "",
        enabled: !0,
        autofocus: !0,
        shellPromptRules: YTR(R),
        imageAttachments: this.imageAttachments,
        onInsertImage: this.handleInsertImage,
        popImage: this.handlePopImage,
        onImageClick: this.handleImageClick,
        minLines: 1,
        textColor: t,
        autocompleteHandle: this.widget.autocompleteHandle,
        autoOverlayPosition: !0,
        onDoubleAtTrigger: this.widget.onDoubleAtTrigger,
        submitKey: this.widget.submitOnEnter ? {
          character: "Enter"
        } : {
          character: "Enter",
          modifiers: {
            meta: !0
          }
        }
      }),
      s = [];
    if (this.currentShellModeStatus === ex) s.push(new G("shell mode (incognito)", new cT({
      color: R.app.shellModeHidden
    })));else if (this.currentShellModeStatus === VrT) s.push(new G("shell mode", new cT({
      color: R.app.shellMode
    })));else s.push(new G("esc", new cT({
      color: e.keybind
    })), new G(" to cancel", new cT({
      color: a.foreground,
      dim: !0
    })));
    return new BtT({
      child: new Rt({
        decoration: {
          color: a.background,
          border: h9.all(new e9(t, 2, "solid"))
        },
        padding: TR.only({
          left: 1,
          right: 1
        }),
        overlays: [{
          child: new xT({
            text: new G("", void 0, s)
          }),
          position: "bottom",
          alignment: "left"
        }],
        child: c
      })
    });
  }
};
w8R = class w8R extends wR {
  pendingInterruptQueuedMessageIDs = new Set();
  isInterruptArrowEmphasized = !1;
  interruptBlinkTimer = null;
  getQueuedMessageID(T) {
    return T.queuedMessage.dtwMessageID ?? T.id;
  }
  parseQueuedMessageID(T) {
    let R = z9.safeParse(T);
    if (!R.success) return;
    return R.data;
  }
  initState() {
    super.initState(), this.updateInterruptBlinkAnimationState();
  }
  didUpdateWidget(T) {
    super.didUpdateWidget(T), this.updateInterruptBlinkAnimationState();
  }
  dispose() {
    this.stopInterruptBlinkAnimation(), super.dispose();
  }
  build(T) {
    let {
      queuedMessages: R,
      title: a = "Queue"
    } = this.widget.props;
    if (!Array.isArray(R) || R.length === 0) return this.updateInterruptBlinkAnimationState(), new XT({
      width: 0,
      height: 0
    });
    let e = new Set(R.map(r => this.getQueuedMessageID(r)));
    for (let r of R) if (r.interrupt) this.pendingInterruptQueuedMessageIDs.delete(this.getQueuedMessageID(r));
    for (let r of this.pendingInterruptQueuedMessageIDs) if (!e.has(r)) this.pendingInterruptQueuedMessageIDs.delete(r);
    this.updateInterruptBlinkAnimationState();
    let t = R.map(r => this.buildQueueItem(r));
    return new SR({
      child: new uR({
        padding: TR.symmetric(1, 0),
        child: new xR({
          crossAxisAlignment: "stretch",
          children: [new xT({
            text: new G(a, new cT({
              bold: !0
            }))
          }), ...t]
        })
      })
    });
  }
  buildQueueItem(T) {
    let R = $R.maybeOf(this.context)?.colors ?? Z0.of(this.context).colorScheme,
      a = this.getQueuedMessageID(T),
      e = T.interrupt === !0 || this.pendingInterruptQueuedMessageIDs.has(a),
      t = T.queuedMessage.content.filter(o => o.type === "text").map(o => o.text).join(" ").trim(),
      r = T.queuedMessage.content.filter(o => o.type === "image").length,
      h = t.split(`
`)[0],
      i = t.includes(`
`) ? `${h}...` : t,
      c = new cT({
        color: R.mutedForeground,
        dim: e
      }),
      s = [new G(i, c)];
    if (r > 0) {
      let o = new cT({
        color: R.success
      });
      for (let n = 1; n <= r; n++) s.push(new G(" ")), s.push(new G(`[${n}]`, o));
    }
    let A = this.widget.props.onRemoveQueuedMessage ? new Fw({
        text: "x",
        onPressed: () => {
          let o = this.parseQueuedMessageID(a);
          if (!o) return;
          this.widget.props.onRemoveQueuedMessage?.(o);
        },
        padding: TR.symmetric(0, 0),
        color: R.mutedForeground
      }) : null,
      l = this.widget.props.onInterruptQueuedMessage ? e ? new xT({
        text: new G("\u2191", new cT({
          color: R.foreground,
          dim: !this.isInterruptArrowEmphasized
        }))
      }) : new Fw({
        text: "\u2191",
        onPressed: () => this.interruptQueuedMessage(a),
        padding: TR.symmetric(0, 0),
        color: R.mutedForeground
      }) : null;
    return new uR({
      padding: TR.only({
        bottom: 0
      }),
      child: new T0({
        crossAxisAlignment: "start",
        children: [...(l ? [new uR({
          padding: TR.only({
            right: 1
          }),
          child: l
        })] : []), new uR({
          padding: TR.only({
            right: 1
          }),
          child: new xT({
            text: new G("\u2022", new cT({
              color: R.mutedForeground
            }))
          })
        }), new j0({
          child: new xT({
            text: new G("", void 0, s)
          })
        }), ...(A ? [new uR({
          padding: TR.only({
            left: 1
          }),
          child: A
        })] : [])]
      })
    });
  }
  interruptQueuedMessage(T) {
    if (this.pendingInterruptQueuedMessageIDs.has(T)) return;
    let R = this.parseQueuedMessageID(T);
    if (!R) return;
    let a = this.widget.props.onInterruptQueuedMessage;
    if (!a) return;
    this.setState(() => {
      this.pendingInterruptQueuedMessageIDs.add(T);
    }), this.updateInterruptBlinkAnimationState();
    try {
      Promise.resolve(a(R)).catch(() => {
        this.setState(() => {
          this.pendingInterruptQueuedMessageIDs.delete(T);
        }), this.updateInterruptBlinkAnimationState();
      });
    } catch {
      this.setState(() => {
        this.pendingInterruptQueuedMessageIDs.delete(T);
      }), this.updateInterruptBlinkAnimationState();
    }
  }
  hasInterruptingQueuedMessages() {
    if (!this.widget.props.onInterruptQueuedMessage) return !1;
    let T = this.widget.props.queuedMessages;
    if (!Array.isArray(T) || T.length === 0) return !1;
    return T.some(R => R.interrupt === !0 || this.pendingInterruptQueuedMessageIDs.has(this.getQueuedMessageID(R)));
  }
  updateInterruptBlinkAnimationState() {
    if (this.hasInterruptingQueuedMessages()) {
      this.startInterruptBlinkAnimation();
      return;
    }
    this.stopInterruptBlinkAnimation();
  }
  startInterruptBlinkAnimation() {
    if (this.interruptBlinkTimer) return;
    this.interruptBlinkTimer = setInterval(() => {
      this.setState(() => {
        this.isInterruptArrowEmphasized = !this.isInterruptArrowEmphasized;
      });
    }, rz0);
  }
  stopInterruptBlinkAnimation() {
    if (this.interruptBlinkTimer) clearInterval(this.interruptBlinkTimer), this.interruptBlinkTimer = null;
    this.isInterruptArrowEmphasized = !1;
  }
};