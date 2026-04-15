class _1T {
  _selectables = [];
  _idToSelectable = new Map();
  _nextId = 1;
  _selection = null;
  _isDragging = !1;
  _dragAnchor = null;
  _orderedCache = [];
  _orderDirty = !0;
  _listeners = new Set();
  _copyHighlightTimer;
  _clearSelectionTimer;
  _onCopyCallback;
  register(T) {
    let R = this._nextId++;
    return T.selectableId = R, this._selectables.push(T), this._idToSelectable.set(R, T), this._orderDirty = !0, T.onAttachToSelectionArea(this), R;
  }
  unregister(T) {
    let R = this._selectables.indexOf(T);
    if (R === -1) return;
    if (this._selectables.splice(R, 1), this._idToSelectable.delete(T.selectableId), this._orderDirty = !0, this._selection && this._involvesSelectable(this._selection, T.selectableId)) this.clear();
    T.setSelectedRanges([]), T.onDetachFromSelectionArea(this);
  }
  getAllSelectables() {
    return [...this._selectables];
  }
  hitTest(T) {
    this._ensureOrder();
    for (let R = this._orderedCache.length - 1; R >= 0; R--) {
      let a = this._orderedCache[R];
      if (a) {
        let e = a.selectable.globalBounds();
        if (this._pointInRect(T, e)) return a.selectable;
      }
    }
    return null;
  }
  setSelection(T) {
    if (this._selectionsEqual(this._selection, T)) return;
    this._selection = T, this._propagateSelection(), this._notifyListeners();
  }
  getSelection() {
    return this._selection;
  }
  comparePositions(T, R) {
    return this._compareDocumentPositions(T, R);
  }
  clear() {
    this.setSelection(null), this._isDragging = !1, this._dragAnchor = null;
  }
  selectAll() {
    if (this._selectables.length === 0) {
      this.clear();
      return;
    }
    this._ensureOrder();
    let T = this._orderedCache[0],
      R = this._orderedCache[this._orderedCache.length - 1];
    if (!T || !R) {
      this.clear();
      return;
    }
    this.setSelection({
      anchor: {
        selectableId: T.selectable.selectableId,
        offset: 0
      },
      extent: {
        selectableId: R.selectable.selectableId,
        offset: R.selectable.textLength()
      }
    });
  }
  copySelection() {
    if (!this._selection) return "";
    let T = this._splitSelectionBySelectable(this._selection),
      R = [];
    this._ensureOrder();
    for (let {
      selectable: a
    } of this._orderedCache) {
      let e = T.get(a.selectableId);
      if (!e || e.length === 0) continue;
      let t = [];
      for (let r of e) {
        let h = a.getText(r);
        if (h) t.push(h);
      }
      if (t.length > 0) {
        if (R.length > 0 && !R[R.length - 1]?.endsWith(`
`)) R.push(`
`);
        R.push(...t);
      }
    }
    return R.join("");
  }
  startCopyHighlight() {
    if (!this._selection) return;
    this._applyHighlightMode("copy");
  }
  endCopyHighlight() {
    if (!this._selection) return;
    this._applyHighlightMode("selection");
  }
  _startCopyHighlightWithTimer() {
    if (this._copyHighlightTimer) clearTimeout(this._copyHighlightTimer), this._copyHighlightTimer = void 0;
    if (this._clearSelectionTimer) clearTimeout(this._clearSelectionTimer), this._clearSelectionTimer = void 0;
    this.startCopyHighlight(), this._copyHighlightTimer = setTimeout(() => {
      this.endCopyHighlight(), this._copyHighlightTimer = void 0;
    }, 300);
  }
  beginDrag(T) {
    this._isDragging = !0, this._dragAnchor = T, this.setSelection({
      anchor: T,
      extent: T
    });
  }
  updateDrag(T) {
    if (!this._isDragging || !this._dragAnchor) return;
    this.setSelection({
      anchor: this._dragAnchor,
      extent: T
    });
  }
  async endDrag() {
    this._isDragging = !1, await this._autoCopySelection();
  }
  async autoCopySelection() {
    await this._autoCopySelection();
  }
  async _autoCopySelection() {
    if (this._selection) {
      let T = this.copySelection();
      if (T) {
        let R = !1;
        try {
          R = await eA.writeText(T);
        } catch (a) {
          J.error("Failed to write selection to clipboard:", a);
        }
        this._startCopyHighlightWithTimer(), this._clearSelectionTimer = setTimeout(() => {
          this.clear(), this._clearSelectionTimer = void 0;
        }, 300), this._onCopyCallback?.(T, R);
      }
    }
  }
  isDragging() {
    return this._isDragging;
  }
  addListener(T) {
    return this._listeners.add(T), () => this._listeners.delete(T);
  }
  setOnCopyCallback(T) {
    this._onCopyCallback = T;
  }
  dispose() {
    for (let T of this._selectables) T.setSelectedRanges([]), T.onDetachFromSelectionArea(this);
    if (this._selectables.length = 0, this._idToSelectable.clear(), this._orderedCache.length = 0, this._selection = null, this._isDragging = !1, this._dragAnchor = null, this._listeners.clear(), this._copyHighlightTimer) clearTimeout(this._copyHighlightTimer), this._copyHighlightTimer = void 0;
    if (this._clearSelectionTimer) clearTimeout(this._clearSelectionTimer), this._clearSelectionTimer = void 0;
  }
  _ensureOrder() {
    if (!this._orderDirty) return;
    this._orderedCache = this._selectables.map(T => ({
      selectable: T
    })).sort((T, R) => {
      let a = T.selectable.globalBounds(),
        e = R.selectable.globalBounds(),
        t = a.top - e.top;
      if (t !== 0) return t;
      return a.left - e.left;
    }), this._orderDirty = !1;
  }
  _propagateSelection() {
    if (!this._selection) {
      for (let R of this._selectables) R.setSelectedRanges([]);
      return;
    }
    let T = this._splitSelectionBySelectable(this._selection);
    for (let R of this._selectables) {
      let a = T.get(R.selectableId) ?? [];
      R.setSelectedRanges(a);
    }
  }
  _applyHighlightMode(T) {
    if (!this._selection) return;
    for (let R of this._selectables) R.setHighlightMode?.(T);
  }
  _splitSelectionBySelectable(T) {
    let [R, a] = this._compareDocumentPositions(T.anchor, T.extent) <= 0 ? [T.anchor, T.extent] : [T.extent, T.anchor],
      e = new Map();
    if (R.selectableId === a.selectableId) return e.set(R.selectableId, [{
      start: R.offset,
      end: a.offset
    }]), e;
    this._ensureOrder();
    let t = !1;
    for (let {
      selectable: r
    } of this._orderedCache) {
      let h = r.selectableId;
      if (!t) {
        if (h === R.selectableId) t = !0, e.set(h, [{
          start: R.offset,
          end: r.textLength()
        }]);
      } else if (h === a.selectableId) {
        e.set(h, [{
          start: 0,
          end: a.offset
        }]);
        break;
      } else e.set(h, [{
        start: 0,
        end: r.textLength()
      }]);
    }
    return e;
  }
  _compareDocumentPositions(T, R) {
    return zk0(T, R, (a, e) => {
      this._ensureOrder();
      let t = this._orderedCache.findIndex(h => h.selectable.selectableId === a),
        r = this._orderedCache.findIndex(h => h.selectable.selectableId === e);
      if (t === -1 || r === -1) return a - e;
      return t - r;
    });
  }
  _involvesSelectable(T, R) {
    return T.anchor.selectableId === R || T.extent.selectableId === R;
  }
  _pointInRect(T, R) {
    return T.x >= R.left && T.x <= R.right && T.y >= R.top && T.y <= R.bottom;
  }
  _selectionsEqual(T, R) {
    if (T === null && R === null) return !0;
    if (T === null || R === null) return !1;
    return T.anchor.selectableId === R.anchor.selectableId && T.anchor.offset === R.anchor.offset && T.extent.selectableId === R.extent.selectableId && T.extent.offset === R.extent.offset;
  }
  _notifyListeners() {
    for (let T of this._listeners) try {
      T();
    } catch (R) {}
  }
  getDebugInfo() {
    return {
      selectableCount: this._selectables.length,
      hasSelection: this._selection !== null,
      isDragging: this._isDragging,
      selection: this._selection
    };
  }
}