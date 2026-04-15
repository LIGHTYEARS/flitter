class yYT {
  constructor(T) {
    this.treeAdapter = T, this.entries = [], this.bookmark = null;
  }
  _getNoahArkConditionCandidates(T, R) {
    let a = [],
      e = R.length,
      t = this.treeAdapter.getTagName(T),
      r = this.treeAdapter.getNamespaceURI(T);
    for (let h = 0; h < this.entries.length; h++) {
      let i = this.entries[h];
      if (i.type === us.Marker) break;
      let {
        element: c
      } = i;
      if (this.treeAdapter.getTagName(c) === t && this.treeAdapter.getNamespaceURI(c) === r) {
        let s = this.treeAdapter.getAttrList(c);
        if (s.length === e) a.push({
          idx: h,
          attrs: s
        });
      }
    }
    return a;
  }
  _ensureNoahArkCondition(T) {
    if (this.entries.length < 3) return;
    let R = this.treeAdapter.getAttrList(T),
      a = this._getNoahArkConditionCandidates(T, R);
    if (a.length < 3) return;
    let e = new Map(R.map(r => [r.name, r.value])),
      t = 0;
    for (let r = 0; r < a.length; r++) {
      let h = a[r];
      if (h.attrs.every(i => e.get(i.name) === i.value)) {
        if (t += 1, t >= 3) this.entries.splice(h.idx, 1);
      }
    }
  }
  insertMarker() {
    this.entries.unshift(ffT);
  }
  pushElement(T, R) {
    this._ensureNoahArkCondition(T), this.entries.unshift({
      type: us.Element,
      element: T,
      token: R
    });
  }
  insertElementAfterBookmark(T, R) {
    let a = this.entries.indexOf(this.bookmark);
    this.entries.splice(a, 0, {
      type: us.Element,
      element: T,
      token: R
    });
  }
  removeEntry(T) {
    let R = this.entries.indexOf(T);
    if (R >= 0) this.entries.splice(R, 1);
  }
  clearToLastMarker() {
    let T = this.entries.indexOf(ffT);
    if (T >= 0) this.entries.splice(0, T + 1);else this.entries.length = 0;
  }
  getElementEntryInScopeWithTagName(T) {
    let R = this.entries.find(a => a.type === us.Marker || this.treeAdapter.getTagName(a.element) === T);
    return R && R.type === us.Element ? R : null;
  }
  getElementEntry(T) {
    return this.entries.find(R => R.type === us.Element && R.element === T);
  }
}