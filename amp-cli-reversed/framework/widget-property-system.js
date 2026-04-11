// Module: widget-property-system
// Original: segment1[1701517:1726330]
// Type: Scope-hoisted
// Exports: Xk0, Yk0, Qk0, Zk0, RfT, Jk0, Tx0, j1T, Rx0, ax0, S1T, NtT, O1T, ex0, tx0, rx0, hx0, cx0, E1T, sx0
// Category: framework

this._orderedCache) {
  let e = T.get(a.selectableId);
  if (!e || e.length === 0) continue;
  let t = [];
  for (let r of e) {
    let h = a.getText(r);
    if (h) t.push(h)
  }
  if (t.length > 0) {
    if (R.length > 0 && !R[R.length - 1]?.endsWith(`
`)) R.push(`
`);
    R.push(...t)
  }
}
return R.join("")
}
startCopyHighlight() {
  if (!this._selection) return;
  this._applyHighlightMode("copy")
}
endCopyHighlight() {
  if (!this._selection) return;
  this._applyHighlightMode("selection")
}
_startCopyHighlightWithTimer() {
  if (this._copyHighlightTimer) clearTimeout(this._copyHighlightTimer), this._copyHighlightTimer = void 0;
  if (this._clearSelectionTimer) clearTimeout(this._clearSelectionTimer), this._clearSelectionTimer = void 0;
  this.startCopyHighlight(), this._copyHighlightTimer = setTimeout(() => {
    this.endCopyHighlight(), this._copyHighlightTimer = void 0
  }, 300)
}
beginDrag(T) {
  this._isDragging = !0, this._dragAnchor = T, this.setSelection({
    anchor: T,
    extent: T
  })
}
updateDrag(T) {
  if (!this._isDragging || !this._dragAnchor) return;
  this.setSelection({
    anchor: this._dragAnchor,
    extent: T
  })
}
async endDrag() {
  this._isDragging = !1, await this._autoCopySelection()
}
async autoCopySelection() {
  await this._autoCopySelection()
}
async _autoCopySelection() {
  if (this._selection) {
    let T = this.copySelection();
    if (T) {
      let R = !1;
      try {
        R = await eA.writeText(T)
      } catch (a) {
        J.error("Failed to write selection to clipboard:", a)
      }
      this._startCopyHighlightWithTimer(), this._clearSelectionTimer = setTimeout(() => {
        this.clear(), this._clearSelectionTimer = void 0
      }, 300), this._onCopyCallback?.(T, R)
    }
  }
}
isDragging() {
  return this._isDragging
}
addListener(T) {
  return this._listeners.add(T), () => this._listeners.delete(T)
}
setOnCopyCallback(T) {
  this._onCopyCallback = T
}
dispose() {
  for (let T of this._selectables) T.setSelectedRanges([]), T.onDetachFromSelectionArea(this);
  if (this._selectables.length = 0, this._idToSelectable.clear(), this._orderedCache.length = 0, this._selection = null, this._isDragging = !1, this._dragAnchor = null, this._listeners.clear(), this._copyHighlightTimer) clearTimeout(this._copyHighlightTimer), this._copyHighlightTimer = void 0;
  if (this._clearSelectionTimer) clearTimeout(this._clearSelectionTimer), this._clearSelectionTimer = void 0
}
_ensureOrder() {
  if (!this._orderDirty) return;
  this._orderedCache = this._selectables.map((T) => ({
    selectable: T
  })).sort((T, R) => {
    let a = T.selectable.globalBounds(),
      e = R.selectable.globalBounds(),
      t = a.top - e.top;
    if (t !== 0) return t;
    return a.left - e.left
  }), this._orderDirty = !1
}
_propagateSelection() {
  if (!this._selection) {
    for (let R of this._selectables) R.setSelectedRanges([]);
    return
  }
  let T = this._splitSelectionBySelectable(this._selection);
  for (let R of this._selectables) {
    let a = T.get(R.selectableId) ?? [];
    R.setSelectedRanges(a)
  }
}
_applyHighlightMode(T) {
  if (!this._selection) return;
  for (let R of this._selectables) R.setHighlightMode?.(T)
}
_splitSelectionBySelectable(T) {
  let [R, a] = this._compareDocumentPositions(T.anchor, T.extent) <= 0 ? [T.anchor, T.extent] : [T.extent, T.anchor], e = new Map;
  if (R.selectableId === a.selectableId) return e.set(R.selectableId, [{
    start: R.offset,
    end: a.offset
  }]), e;
  this._ensureOrder();
  let t = !1;
  for (let {
      selectable: r
    }
    of this._orderedCache) {
    let h = r.selectableId;
    if (!t) {
      if (h === R.selectableId) t = !0, e.set(h, [{
        start: R.offset,
        end: r.textLength()
      }])
    } else if (h === a.selectableId) {
      e.set(h, [{
        start: 0,
        end: a.offset
      }]);
      break
    } else e.set(h, [{
      start: 0,
      end: r.textLength()
    }])
  }
  return e
}
_compareDocumentPositions(T, R) {
  return zk0(T, R, (a, e) => {
    this._ensureOrder();
    let t = this._orderedCache.findIndex((h) => h.selectable.selectableId === a),
      r = this._orderedCache.findIndex((h) => h.selectable.selectableId === e);
    if (t === -1 || r === -1) return a - e;
    return t - r
  })
}
_involvesSelectable(T, R) {
  return T.anchor.selectableId === R || T.extent.selectableId === R
}
_pointInRect(T, R) {
  return T.x >= R.left && T.x <= R.right && T.y >= R.top && T.y <= R.bottom
}
_selectionsEqual(T, R) {
  if (T === null && R === null) return !0;
  if (T === null || R === null) return !1;
  return T.anchor.selectableId === R.anchor.selectableId && T.anchor.offset === R.anchor.offset && T.extent.selectableId === R.extent.selectableId && T.extent.offset === R.extent.offset
}
_notifyListeners() {
  for (let T of this._listeners) try {
    T()
  }
  catch (R) {}
}
getDebugInfo() {
  return {
    selectableCount: this._selectables.length,
    hasSelection: this._selection !== null,
    isDragging: this._isDragging,
    selection: this._selection
  }
}
}

function Xk0(T, R, a) {
  if (a(R.end, T.start) <= 0) return {
    start: R.start,
    end: T.end
  };
  if (a(R.start, T.end) >= 0) return {
    start: T.start,
    end: R.end
  };
  return T
}

function Yk0(T) {
  return "comparePositions" in T && typeof T.comparePositions === "function"
}
class m1T {
  _onKeepAliveChange;
  _parent;
  _parentListenerCleanup;
  _selectables = new Set;
  _keptAlive = !1;
  constructor(T) {
    this._onKeepAliveChange = T
  }
  setParent(T) {
    if (this._parent === T) return;
    this._parentListenerCleanup?.(), this._parent = T, this._parentListenerCleanup = T.addListener(() => {
      this._updateKeepAlive()
    }), this._updateKeepAlive()
  }
  disposeBoundary() {
    this._parentListenerCleanup?.(), this._parentListenerCleanup = void 0, this._selectables.clear(), this._setKeptAlive(!1)
  }
  register(T) {
    this._selectables.add(T);
    let R = this._requireParent().register(T);
    return this._updateKeepAlive(), R
  }
  unregister(T) {
    this._selectables.delete(T), this._requireParent().unregister(T), this._updateKeepAlive()
  }
  hitTest(T) {
    return this._requireParent().hitTest(T)
  }
  setSelection(T) {
    this._requireParent().setSelection(T)
  }
  getSelection() {
    return this._requireParent().getSelection()
  }
  clear() {
    this._requireParent().clear()
  }
  selectAll() {
    this._requireParent().selectAll()
  }
  copySelection() {
    return this._requireParent().copySelection()
  }
  startCopyHighlight() {
    this._requireParent().startCopyHighlight()
  }
  endCopyHighlight() {
    this._requireParent().endCopyHighlight()
  }
  beginDrag(T) {
    this._requireParent().beginDrag(T)
  }
  updateDrag(T) {
    this._requireParent().updateDrag(T)
  }
  endDrag() {
    this._requireParent().endDrag()
  }
  isDragging() {
    return this._requireParent().isDragging()
  }
  addListener(T) {
    return this._requireParent().addListener(T)
  }
  dispose() {}
  _requireParent() {
    if (!this._parent) throw Error("SelectionKeepAliveBoundary requires an ancestor SelectionArea");
    return this._parent
  }
  _updateKeepAlive() {
    let T = this._parent?.getSelection();
    if (!T) {
      this._setKeptAlive(!1);
      return
    }
    for (let R of this._selectables)
      if (this._selectionTouchesSelectable(T, R)) {
        this._setKeptAlive(!0);
        return
      }
    this._setKeptAlive(!1)
  }
  _selectionTouchesSelectable(T, R) {
    if (T.anchor.selectableId === R.selectableId || T.extent.selectableId === R.selectableId) return !0;
    if (!this._parent || !Yk0(this._parent)) return !1;
    let a = this._parent.comparePositions.bind(this._parent),
      [e, t] = a(T.anchor, T.extent) <= 0 ? [T.anchor, T.extent] : [T.extent, T.anchor],
      r = {
        selectableId: R.selectableId,
        offset: 0
      },
      h = {
        selectableId: R.selectableId,
        offset: R.textLength()
      };
    return a(e, h) < 0 && a(t, r) > 0
  }
  _setKeptAlive(T) {
    if (this._keptAlive === T) return;
    this._keptAlive = T, this._onKeepAliveChange(T)
  }
}
class P1T {
  scrollableState;
  context = null;
  constructor(T) {
    this.scrollableState = T
  }
  updateContext(T) {
    this.context = T
  }
  handleKeyEvent(T) {
    let {
      key: R
    } = T;
    if (this.scrollableState.widget.axisDirection === "vertical") switch (R) {
      case "ArrowUp":
        if (this.scrollableState.controller.maxScrollExtent <= 0) return "ignored";
        return this.scrollableState.handleScrollDelta(-this.getScrollStep()), "handled";
      case "ArrowDown":
        if (this.scrollableState.controller.maxScrollExtent <= 0) return "ignored";
        return this.scrollableState.handleScrollDelta(this.getScrollStep()), "handled";
      case "k":
        return this.scrollableState.handleScrollDelta(-this.getScrollStep()), "handled";
      case "j":
        return this.scrollableState.handleScrollDelta(this.getScrollStep()), "handled";
      case "PageUp":
        return this.scrollableState.handleScrollDelta(-this.getPageScrollStep()), "handled";
      case "PageDown":
        return this.scrollableState.handleScrollDelta(this.getPageScrollStep()), "handled";
      case "u":
        if (T.ctrlKey) return this.scrollableState.handleScrollDelta(-this.getPageScrollStep()), "handled";
        break;
      case "d":
        if (T.ctrlKey) return this.scrollableState.handleScrollDelta(this.getPageScrollStep()), "handled";
        break;
      case "Home":
        return this.scrollableState.controller.scrollToTop(), "handled";
      case "End":
        return this.scrollableState.controller.scrollToBottom(), "handled";
      case "g":
        if (T.shiftKey) return this.scrollableState.controller.scrollToBottom(), "handled";
        else return this.scrollableState.controller.scrollToTop(), "handled"
    }
    if (this.scrollableState.widget.axisDirection === "horizontal") switch (R) {
      case "ArrowLeft":
        return this.scrollableState.handleScrollDelta(-this.getScrollStep()), "handled";
      case "ArrowRight":
        return this.scrollableState.handleScrollDelta(this.getScrollStep()), "handled";
      case "h":
        return this.scrollableState.handleScrollDelta(-this.getScrollStep()), "handled";
      case "l":
        return this.scrollableState.handleScrollDelta(this.getScrollStep()), "handled";
      case "Home":
        return this.scrollableState.controller.scrollToTop(), "handled";
      case "End":
        return this.scrollableState.controller.scrollToBottom(), "handled";
      case "g":
        if (T.shiftKey) return this.scrollableState.controller.scrollToBottom(), "handled";
        else return this.scrollableState.controller.scrollToTop(), "handled"
    }
    return "ignored"
  }
  handleMouseWheel(T) {
    let R = T * this.getScrollStep();
    this.scrollableState.handleScrollDelta(R)
  }
  handleMouseEvent(T) {
    if (T.button >= 64 && T.button <= 67 && T.pressed) switch (T.button) {
      case 64:
        if (this.scrollableState.widget.axisDirection === "vertical") return this.scrollableState.handleScrollDelta(-this.getScrollStep()), !0;
        break;
      case 65:
        if (this.scrollableState.widget.axisDirection === "vertical") return this.scrollableState.handleScrollDelta(this.getScrollStep()), !0;
        break;
      case 66:
        if (this.scrollableState.widget.axisDirection === "horizontal") return this.scrollableState.handleScrollDelta(-this.getScrollStep()), !0;
        break;
      case 67:
        if (this.scrollableState.widget.axisDirection === "horizontal") return this.scrollableState.handleScrollDelta(this.getScrollStep()), !0;
        break
    }
    return !1
  }
  getScrollStep() {
    if (this.context) try {
      return I9.capabilitiesOf(this.context).scrollStep()
    }
    catch {}
    return 3
  }
  getPageScrollStep() {
    return 10
  }
}
class Q3 {
  _offset = 0;
  _listeners = [];
  _disposed = !1;
  _maxScrollExtent = 0;
  _hasInitialOffset = !1;
  _animationTimer = null;
  _animationTarget = null;
  _animationStartTime = 0;
  _animationDuration = 0;
  _animationCurve = "linear";
  _followMode = !0;
  get offset() {
    return this._offset
  }
  get currentLine() {
    return this._offset
  }
  get maxScrollExtent() {
    return this._maxScrollExtent
  }
  get atTop() {
    return this._offset <= 0
  }
  get atBottom() {
    return this._offset >= this._maxScrollExtent
  }
  get atEdge() {
    return this.atTop || this.atBottom
  }
  get followMode() {
    return this._followMode
  }
  set followMode(T) {
    this._followMode = T
  }
  get isDisposed() {
    return this._disposed
  }
  get hasInitialOffset() {
    return this._hasInitialOffset
  }
  addListener(T) {
    if (this._disposed) throw Error("ScrollController is disposed");
    this._listeners.push(T)
  }
  removeListener(T) {
    let R = this._listeners.indexOf(T);
    if (R !== -1) this._listeners.splice(R, 1)
  }
  updateMaxScrollExtent(T) {
    if (this._disposed) return;
    let R = this._maxScrollExtent;
    if (this._maxScrollExtent = T, R !== T) this._notifyListeners()
  }
  updateOffset(T) {
    if (this._disposed) return;
    if (this._offset !== T) this._offset = T, this._hasInitialOffset = !0, this._notifyListeners()
  }
  animateTo(T, R = 150) {
    if (this._disposed) return;
    let {
      duration: a,
      curve: e
    } = this._resolveAnimationOptions(R), t = Math.max(0, Math.min(this._maxScrollExtent, T));
    if (a <= 0 || Math.abs(this._offset - t) <= 1) {
      this.jumpTo(t);
      return
    }
    if (this._animationTimer && this._animationTarget !== null) {
      this._animationTarget = t;
      return
    }
    this._animationTarget = t, this._animationStartTime = Date.now(), this._animationDuration = Math.max(1, a), this._animationCurve = e;
    let r = this._offset,
      h = 16;
    this._animationTimer = setInterval(() => {
      let i = Date.now() - this._animationStartTime,
        c = this._animationTarget,
        s = c - r,
        A = Math.min(i / this._animationDuration, 1),
        l = this._applyAnimationCurve(A, this._animationCurve);
      if (A >= 1) {
        if (this._animationTimer) clearInterval(this._animationTimer), this._animationTimer = null, this._animationTarget = null;
        this.updateOffset(c)
      } else {
        let o = r + s * l;
        this.updateOffset(Math.round(o))
      }
    }, h)
  }
  jumpTo(T) {
    if (this._disposed) return;
    let R = Math.max(0, Math.min(this._maxScrollExtent, T));
    this.updateOffset(R)
  }
  animateToLine(T, R) {
    this.animateTo(T, R)
  }
  jumpToLine(T) {
    this.jumpTo(T)
  }
  scrollToTop() {
    this.jumpTo(0)
  }
  scrollToBottom() {
    this.jumpTo(this._maxScrollExtent)
  }
  animateToBottom(T = 150) {
    this.animateTo(this._maxScrollExtent, T)
  }
  enableFollowMode() {
    this._followMode = !0
  }
  disableFollowMode() {
    this._followMode = !1
  }
  toggleFollowMode() {
    this._followMode = !this._followMode
  }
  scrollUp(T) {
    if (this._disposed) return;
    let R = Math.max(0, this._offset - T);
    this.jumpTo(R)
  }
  scrollDown(T) {
    if (this._disposed) return;
    let R = Math.min(this._maxScrollExtent, this._offset + T);
    this.jumpTo(R)
  }
  animateScrollUp(T, R) {
    if (this._disposed) return;
    let a = this._animationTarget ?? this._offset,
      e = Math.max(0, a - T);
    this.animateTo(e, R)
  }
  animateScrollDown(T, R) {
    if (this._disposed) return;
    let a = (this._animationTarget ?? this._offset) + T;
    this.animateTo(a, R)
  }
  scrollPageUp(T) {
    let R = Math.max(1, Math.floor(T / 2));
    this.scrollUp(R)
  }
  scrollPageDown(T) {
    let R = Math.max(1, Math.floor(T / 2));
    this.scrollDown(R)
  }
  animatePageUp(T, R) {
    let a = Math.max(1, T);
    this.animateScrollUp(a, this._resolveAnimationOptions(R, 100))
  }
  animatePageDown(T, R) {
    let a = Math.max(1, T);
    this.animateScrollDown(a, this._resolveAnimationOptions(R, 100))
  }
  dispose() {
    if (this._disposed) return;
    if (this._animationTimer) clearInterval(this._animationTimer), this._animationTimer = null, this._animationTarget = null;
    this._listeners.length = 0, this._disposed = !0
  }
  _resolveAnimationOptions(T, R = 150) {
    if (typeof T === "number") return {
      duration: T,
      curve: "linear"
    };
    return {
      duration: T?.duration ?? R,
      curve: T?.curve ?? "linear"
    }
  }
  _applyAnimationCurve(T, R) {
    switch (R) {
      case "easeOutCubic":
        return 1 - (1 - T) ** 3;
      case "easeInOutCubic":
        return T < 0.5 ? 4 * T ** 3 : 1 - (-2 * T + 2) ** 3 / 2;
      case "linear":
      default:
        return T
    }
  }
  _notifyListeners() {
    let T = [...this._listeners];
    for (let R of T) try {
      R()
    }
    catch (a) {
      J.error("Error in scroll listener:", a)
    }
  }
}
class k1T {
  shouldAcceptUserOffset() {
    return !0
  }
  applyTo(T) {
    return this
  }
}

function Qk0({
  command: T,
  commandPath: R,
  rootCommand: a
}) {
  let e = "";
  if (T === a) e += oR.bold("Amp CLI") + `

`;
  if (e += oR.bold("Usage:") + " " + oR.green(Zk0(R, T)) + `

`, T !== a && T.description) e += T.description + `

`;
  let t = T.subcommands;
  if (t !== void 0 && t.length > 0) e += oR.bold("Commands:") + `

`, e += Tx0(t), e += `
`;
  if (e += RfT(T.options, "Options:"), T !== a) {
    let r = new Set(T.options.map((i) => i.long)),
      h = a.options.filter((i) => !r.has(i.long));
    e += RfT(h, "Global options:")
  }
  return e
}

function Zk0(T, R) {
  let a = [T, "[options]"];
  if ((R.subcommands?.length ?? 0) > 0) a.push("[command]");
  for (let e of R.positionals) a.push(e.required ? `<${e.name}>` : `[${e.name}]`);
  return a.join(" ")
}

function RfT(T, R) {
  if (T.length === 0) return "";
  let a = T.map((t) => [Jk0(t), t.description]),
    e = oR.bold(R) + `

`;
  return e += AtT(a), e += `
`, e
}

function Jk0(T) {
  let R = `--${T.long}`;
  if (T.type === "boolean") return T.short ? `-${T.short}, ${R}` : R;
  return T.short ? `-${T.short}, ${R} <value>` : `${R} <value>`
}

function Tx0(T) {
  let R = j1T(T).map(({
    command: a,
    level: e
  }) => {
    let t = "  ".repeat(e),
      r = a.alias ? `[alias: ${a.alias}] ` : "";
    return [t + a.name, r + (a.description ?? "")]
  });
  return ltT(R)
}

function j1T(T, R = 0) {
  let a = [];
  for (let e of T) {
    a.push({
      command: e,
      level: R
    });
    let t = e.subcommands;
    if (t !== void 0 && t.length > 0) a.push(...j1T(t, R + 1))
  }
  return a
}

function Rx0(T) {
  return T
}
async function ax0(T, R = process.argv.slice(2)) {
  let a = O1T(T, R, T.name, T);
  await S1T(a, T, a.options)
}
async function S1T(T, R, a) {
  if (T.subcommand) {
    let e = NtT(R.subcommands, T.subcommand.name);
    if (await S1T(T.subcommand, e, a)) return !0
  }
  if (R.action) return await R.action({
    options: T.options,
    positionals: T.positionals,
    globalOptions: a
  }), !0;
  return !1
}

function NtT(T, R) {
  return T?.find((a) => a.name === R || a.alias === R)
}

function O1T(T, R, a, e) {
  let {
    options: t,
    positionalValues: r,
    subcommandName: h,
    subcommandArgv: i
  } = tx0(T.options, R, T, a, e), c = rx0(T.positionals, r), s;
  if (h) {
    let A = NtT(T.subcommands, h),
      l = O1T(A, i, `${a} ${A.name}`, e);
    s = {
      name: A.name,
      options: l.options,
      positionals: l.positionals,
      subcommand: l.subcommand
    }
  }
  return {
    options: t,
    positionals: c,
    subcommand: s
  }
}

function ex0(T, R) {
  if (R.startsWith("--")) {
    let a = R.slice(2);
    return T.find((e) => e.long === a)
  }
  if (R.startsWith("-") && R.length === 2) {
    let a = R[1];
    return T.find((e) => e.short === a)
  }
  return
}

function tx0(T, R, a, e, t) {
  let r = {},
    h = [],
    i, c = [];
  for (let s of T) r[s.long] = s.default;
  for (let s = 0; s < R.length; s++) {
    let A = R[s];
    if (A === "--help" || A === "-h") hx0(a, e, t), process.exit(0);
    if (A === "--") {
      h.push(...R.slice(s + 1));
      break
    }
    let l = ex0(T, A);
    if (l) {
      if (l.type === "boolean") r[l.long] = !0;
      else {
        let o = R[++s];
        if (o === void 0) throw new Gw(`Option ${A} requires a value`);
        r[l.long] = l.type === "number" ? Number(o) : o
      }
      continue
    }
    if (A.startsWith("-")) throw new Gw(`Unknown option: ${A}`);
    if (NtT(a.subcommands, A)) {
      i = A, c = R.slice(s + 1);
      break
    }
    h.push(A)
  }
  return {
    options: r,
    positionalValues: h,
    subcommandName: i,
    subcommandArgv: c
  }
}

function rx0(T, R) {
  let a = {};
  for (let e = 0; e < T.length; e++) {
    let t = T[e],
      r = R[e];
    if (t.required && r === void 0) throw new Gw(`Missing required argument: <${t.name}>`);
    a[t.name] = r
  }
  return a
}

function hx0(T, R, a) {
  console.log(Qk0({
    command: T,
    commandPath: R,
    rootCommand: a
  }))
}
class UtT {
  _active = !1;
  _timeout = null;
  state;
  durationMs;
  constructor(T, R) {
    this.state = T, this.durationMs = R;
    let a = T.dispose.bind(T);
    T.dispose = () => {
      this.dispose(), a()
    }
  }
  isActive() {
    return this._active
  }
  activate = () => {
    if (this._timeout) clearTimeout(this._timeout);
    if (!this._active) this.state.setState(() => {
      this._active = !0
    });
    this._timeout = setTimeout(() => {
      this._timeout = null, this.state.setState(() => {
        this._active = !1
      })
    }, this.durationMs)
  };
  clear = () => {
    if (this._timeout) clearTimeout(this._timeout), this._timeout = null;
    if (this._active) this.state.setState(() => {
      this._active = !1
    })
  };
  dispose() {
    if (this._timeout) clearTimeout(this._timeout), this._timeout = null
  }
}
class d1T {
  _value;
  state;
  constructor(T, R = !1) {
    this.state = T, this._value = R
  }
  isEnabled() {
    return this._value
  }
  isDisabled() {
    return !this._value
  }
  toggle = () => {
    this.state.setState(() => {
      this._value = !this._value
    })
  };
  enable = () => {
    if (this._value) return;
    this.state.setState(() => {
      this._value = !0
    })
  };
  disable = () => {
    if (!this._value) return;
    this.state.setState(() => {
      this._value = !1
    })
  }
}

function cx0(T) {
  if (ix0.has(T.key)) return !0;
  if (T.ctrlKey || T.altKey || T.metaKey) return !0;
  if (T.key.length === 1) {
    if (T.key.charCodeAt(0) < 32) return !0
  }
  return !1
}

function E1T(T, R, a = {}) {
  let e = a.padding ?? 1,
    t = T.findRenderObject();
  if (!t) return;
  let r = sx0(t);
  if (!r) return;
  let h = r.scrollController;
  if (!h) return;
  let i = ox0(t, R, r);
  if (!i) return;
  let c = r.size.height,
    s = h.offset,
    A = s;
  if (i.top < e) A = s + i.top - e;
  else if (i.bottom > c - e) A = s + (i.bottom - (c - e));
  else return;
  let l = h.maxScrollExtent;
  if (A = Math.max(0, Math.min(A, l)), A !== s) h.jumpTo(A)
}

function sx0(T) {
  let R = T.parent;
  while (R) {
    if ("scrollController" in R && R.scrollController) return R;
    if (R = R.parent, R && !("size" in R)) break
  }
  return null
}

function ox0(T, R, a) {
  let {
    top: e,
    bottom: t
  } = R, r = T;
  while (r && r !== a) {
    let h = r.offset;
    if (e += h.y, t += h.y, r = r.parent, r && !("size" in r)) return null
  }
  if (r !== a) return null;
  return {
    top: e,
    bottom: t
  }
}
class Kw {
  _text = "";
  _config;
  _lines = null;
  _graphemes = null;
  constructor(T, R) {
    this._text = T, this._config = R
  }
  updateText(T) {
    if (this._text !== T) this._text = T, this._invalidateCache()
  }
  updateConfig(T) {
    if (JSON.stringify(this._config) !== JSON.stringify(T)) this._config = T, this._invalidateCache()
  }
  get lines() {
    if (this._lines === null) this._computeLines();
    return this._lines
  }
  get graphemes() {
    if (this._graphemes === null) this._graphemes = B9(this._text);
    return this._graphemes
  }
  getLineCount() {
    return this._text.split(`
`).length
  }
  getLine(T) {
    let R = this.lines;
    return T >= 0 && T < R.length ? R[T] ?? null : null
  }
  offsetToLineIndex(T) {
    let R = this.lines;
    for (let a = 0; a < R.length; a++) {
      let e = R[a];
      if (e && T >= e.startOffset && T <= e.endOffset) return a
    }
    return Math.max(0, R.length - 1)
  }
  offsetToPosition(T) {
    let R = this.graphemes,
      a = 0,
      e = 0;
    for (let t = 0; t < T && t < R.length; t++)
      if (R[t] === `
`) a++, e = 0;
      else e++;
    return {
      line: a,
      column: e
    }
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
`) e++, t = 0;
      else t++
    }
    return a.length
  }
  getLineText(T) {
    let R = this._text.split(`
`);
    return T >= 0 && T < R.length ? R[T] ?? "" : ""
  }
  _invalidateCache() {
    this._lines = null, this._graphemes = null
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
      return
    }
    let t = 0,
      r = 0,
      h = 0;
    while (h < T.length) {
      let c = T[h];
      if (!c) {
        h++;
        continue
      }
      if (c === `
`) {
        this._lines.push({
          startOffset: t,
          endOffset: h,
          width: r,
          isHardBreak: !0
        }), t = h + 1, r = 0, h++;
        continue
      }
      let s = J8(c, e);
      if (a !== "none" && r + s > R && r > 0) {
        let A = h;
        if (a === "word") {
          let o = this._findWordWrapPoint(T, t, h);
          if (o < h)
            if (this._getNextWordLength(T, o, e) > R) A = this._fillToCapacity(T, t, R, e);
            else A = o;
          else A = this._fillToCapacity(T, t, R, e)
        }
        let l = this._calculateLineWidth(T, t, A, e);
        if (this._lines.push({
            startOffset: t,
            endOffset: A,
            width: l,
            isHardBreak: !1
          }), t = A, a === "word") {
          if (t < T.length && T[t] && /\s/.test(T[t]))
            while (t < T.length && T[t] && /\s/.test(T[t])) t++
        }
        r = 0, h = t;
        continue
      }
      r += s, h++
    }
    let i = T.length > 0 && T[T.length - 1] === `
`;
    if (t < T.length || this._lines.length === 0 || i) this._lines.push({
      startOffset: t,
      endOffset: T.length,
      width: r,
      isHardBreak: !1
    })
  }
  _findWordWrapPoint(T, R, a) {
    for (let e = a - 1; e > R; e--)
      if (T[e] && /\s/.test(T[e])) {
        while (e > R && T[e] && /\s/.test(T[e])) e--;
        return e + 1
      }
    return a
  }
  _getNextWordLength(T, R, a) {
    let e = 0,
      t = R;
    while (t < T.length && T[t] && /\s/.test(T[t])) t++;
    while (t < T.length && T[t] && !/\s/.test(T[t])) {
      let r = T[t];
      if (!r || r === `
`) break;
      e += J8(r, a), t++
    }
    return e
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
      t += c, r = h + 1
    }
    return r
  }
  _calculateLineWidth(T, R, a, e) {
    let t = 0;
    for (let r = R; r < a; r++) {
      let h = T[r];
      if (h && h !== `
`) t += J8(h, e)
    }
    return t
  }
}

function nx0(T) {
  return "scrollOffset" in T
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
    }), this._cursorPosition = this._layoutEngine.graphemes.length, this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition), this._collapseSelection()
  }
  get text() {
    return this._text
  }
  set text(T) {
    if (this._text !== T) this._text = T, this._layoutEngine.updateText(T), this._cursorPosition = this._layoutEngine.graphemes.length, this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition), this._notifyListeners()
  }
  get cursorPosition() {
    return this._cursorPosition
  }
  set cursorPosition(T) {
    this._setCursorPosition(T, !1)
  }
  _setCursorPosition(T, R = !1) {
    let a = this._getMinimumCursorPosition(),
      e = Math.max(a, Math.min(T, this._layoutEngine.graphemes.length));
    if (this._cursorPosition !== e) {
      if (R && !this.hasSelection) this._selectionBase = this._cursorPosition;
      if (this._cursorPosition = e, this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition), R) this._selectionExtent = e;
      else this._collapseSelection();
      this._notifyListeners()
    }
  }
  get graphemes() {
    return this._layoutEngine.graphemes
  }
  get hasSelection() {
    return this._selectionBase !== this._selectionExtent
  }
  get selectionRange() {
    if (!this.hasSelection) return null;
    return {
      start: Math.min(this._selectionBase, this._selectionExtent),
      end: Math.max(this._selectionBase, this._selectionExtent)
    }
  }
  get selectedText() {
    let T = this.selectionRange;
    if (!T) return "";
    return this.graphemes.slice(T.start, T.end).join("")
  }
  get lines() {
    return this._text.split(`
`)
  }
  clearSelection() {
    this._collapseSelection(), this._notifyListeners()
  }
  updateLayoutConfig(T, R = "none", a) {
    let e = {
      maxWidth: T,
      wrapMode: R
    };
    if (a !== void 0) e.emojiSupported = a;
    this._layoutEngine.updateConfig(e)
  }
  calculateLayoutLines(T, R = "none", a) {
    let e = {
      maxWidth: T,
      wrapMode: R
    };
    if (a !== void 0) e.emojiSupported = a;
    return new Kw(this._text, e).lines
  }
  offsetToPosition(T) {
    return this._layoutEngine.offsetToPosition(T)
  }
  positionToOffset(T, R) {
    return this._layoutEngine.positionToOffset(T, R)
  }
  get cursorTextPosition() {
    return this.offsetToPosition(this._cursorPosition)
  }
  _getColumnFromOffset(T) {
    return this.offsetToPosition(T).column
  }
  _getStringPositionFromGraphemeIndex(T) {
    if (T <= 0) return 0;
    try {
      let R = B9(this._text);
      if (T < R.length) {
        let a = 0;
        for (let e = 0; e < T; e++) a += R[e].length;
        return a
      }
      return this._text.length
    } catch (R) {
      let a = Array.from(this._text),
        e = 0;
      for (let t = 0; t < Math.min(T, a.length); t++) e += a[t].length;
      return Math.min(e, this._text.length)
    }
  }
  _getLayoutColumnFromOffset(T) {
    let R = this.getLayoutLines();
    for (let a = 0; a < R.length; a++) {
      let e = R[a];
      if (e && T >= e.startOffset && T <= e.endOffset) return T - e.startOffset
    }
    return 0
  }
  getLineCount() {
    return this._layoutEngine.lines.length
  }
  getLayoutLines() {
    return this._layoutEngine.lines
  }
  getLine(T) {
    return this._layoutEngine.getLineText(T)
  }
  getCursorVisualRow() {
    return this.getCurrentLayoutLine()?.index ?? 0
  }
  set onInsertText(T) {
    this._onInsertText = T
  }
  get onInsertText() {
    return this._onInsertText
  }
  insertText(T) {
    if (this._onInsertText && this._onInsertText(T, this) === !1) return;
    if (this.hasSelection) this.deleteSelectedText();
    let R = this._getStringPositionFromGraphemeIndex(this._cursorPosition);
    this._text = this._text.slice(0, R) + T + this._text.slice(R), this._layoutEngine.updateText(this._text);
    let a = B9(T);
    this._cursorPosition += a.length, this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition), this._collapseSelection(), this._notifyListeners()
  }
  deleteWordLeft() {
      let T = this._getWordBoundary(-1),
        R = Math.max(0, this._cursorPosition - T);
      if (R > 0) {
        let a = this._getStringPositionFromGraphemeIndex(T),
          e = this._getStringPositionFromGraphemeIndex(this._cursorPosition);
        this._