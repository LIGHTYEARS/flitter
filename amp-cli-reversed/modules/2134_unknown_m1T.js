function Xk0(T, R, a) {
  if (a(R.end, T.start) <= 0) return {
    start: R.start,
    end: T.end
  };
  if (a(R.start, T.end) >= 0) return {
    start: T.start,
    end: R.end
  };
  return T;
}
function Yk0(T) {
  return "comparePositions" in T && typeof T.comparePositions === "function";
}
class m1T {
  _onKeepAliveChange;
  _parent;
  _parentListenerCleanup;
  _selectables = new Set();
  _keptAlive = !1;
  constructor(T) {
    this._onKeepAliveChange = T;
  }
  setParent(T) {
    if (this._parent === T) return;
    this._parentListenerCleanup?.(), this._parent = T, this._parentListenerCleanup = T.addListener(() => {
      this._updateKeepAlive();
    }), this._updateKeepAlive();
  }
  disposeBoundary() {
    this._parentListenerCleanup?.(), this._parentListenerCleanup = void 0, this._selectables.clear(), this._setKeptAlive(!1);
  }
  register(T) {
    this._selectables.add(T);
    let R = this._requireParent().register(T);
    return this._updateKeepAlive(), R;
  }
  unregister(T) {
    this._selectables.delete(T), this._requireParent().unregister(T), this._updateKeepAlive();
  }
  hitTest(T) {
    return this._requireParent().hitTest(T);
  }
  setSelection(T) {
    this._requireParent().setSelection(T);
  }
  getSelection() {
    return this._requireParent().getSelection();
  }
  clear() {
    this._requireParent().clear();
  }
  selectAll() {
    this._requireParent().selectAll();
  }
  copySelection() {
    return this._requireParent().copySelection();
  }
  startCopyHighlight() {
    this._requireParent().startCopyHighlight();
  }
  endCopyHighlight() {
    this._requireParent().endCopyHighlight();
  }
  beginDrag(T) {
    this._requireParent().beginDrag(T);
  }
  updateDrag(T) {
    this._requireParent().updateDrag(T);
  }
  endDrag() {
    this._requireParent().endDrag();
  }
  isDragging() {
    return this._requireParent().isDragging();
  }
  addListener(T) {
    return this._requireParent().addListener(T);
  }
  dispose() {}
  _requireParent() {
    if (!this._parent) throw Error("SelectionKeepAliveBoundary requires an ancestor SelectionArea");
    return this._parent;
  }
  _updateKeepAlive() {
    let T = this._parent?.getSelection();
    if (!T) {
      this._setKeptAlive(!1);
      return;
    }
    for (let R of this._selectables) if (this._selectionTouchesSelectable(T, R)) {
      this._setKeptAlive(!0);
      return;
    }
    this._setKeptAlive(!1);
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
    return a(e, h) < 0 && a(t, r) > 0;
  }
  _setKeptAlive(T) {
    if (this._keptAlive === T) return;
    this._keptAlive = T, this._onKeepAliveChange(T);
  }
}