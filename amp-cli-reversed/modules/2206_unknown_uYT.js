class uYT {
  get currentTmplContentOrNode() {
    return this._isInTemplate() ? this.treeAdapter.getTemplateContent(this.current) : this.current;
  }
  constructor(T, R, a) {
    this.treeAdapter = R, this.handler = a, this.items = [], this.tagIDs = [], this.stackTop = -1, this.tmplCount = 0, this.currentTagId = sT.UNKNOWN, this.current = T;
  }
  _indexOf(T) {
    return this.items.lastIndexOf(T, this.stackTop);
  }
  _isInTemplate() {
    return this.currentTagId === sT.TEMPLATE && this.treeAdapter.getNamespaceURI(this.current) === VR.HTML;
  }
  _updateCurrentElement() {
    this.current = this.items[this.stackTop], this.currentTagId = this.tagIDs[this.stackTop];
  }
  push(T, R) {
    if (this.stackTop++, this.items[this.stackTop] = T, this.current = T, this.tagIDs[this.stackTop] = R, this.currentTagId = R, this._isInTemplate()) this.tmplCount++;
    this.handler.onItemPush(T, R, !0);
  }
  pop() {
    let T = this.current;
    if (this.tmplCount > 0 && this._isInTemplate()) this.tmplCount--;
    this.stackTop--, this._updateCurrentElement(), this.handler.onItemPop(T, !0);
  }
  replace(T, R) {
    let a = this._indexOf(T);
    if (this.items[a] = R, a === this.stackTop) this.current = R;
  }
  insertAfter(T, R, a) {
    let e = this._indexOf(T) + 1;
    if (this.items.splice(e, 0, R), this.tagIDs.splice(e, 0, a), this.stackTop++, e === this.stackTop) this._updateCurrentElement();
    this.handler.onItemPush(this.current, this.currentTagId, e === this.stackTop);
  }
  popUntilTagNamePopped(T) {
    let R = this.stackTop + 1;
    do R = this.tagIDs.lastIndexOf(T, R - 1); while (R > 0 && this.treeAdapter.getNamespaceURI(this.items[R]) !== VR.HTML);
    this.shortenToLength(R < 0 ? 0 : R);
  }
  shortenToLength(T) {
    while (this.stackTop >= T) {
      let R = this.current;
      if (this.tmplCount > 0 && this._isInTemplate()) this.tmplCount -= 1;
      this.stackTop--, this._updateCurrentElement(), this.handler.onItemPop(R, this.stackTop < T);
    }
  }
  popUntilElementPopped(T) {
    let R = this._indexOf(T);
    this.shortenToLength(R < 0 ? 0 : R);
  }
  popUntilPopped(T, R) {
    let a = this._indexOfTagNames(T, R);
    this.shortenToLength(a < 0 ? 0 : a);
  }
  popUntilNumberedHeaderPopped() {
    this.popUntilPopped(qY, VR.HTML);
  }
  popUntilTableCellPopped() {
    this.popUntilPopped(Df0, VR.HTML);
  }
  popAllUpToHtmlElement() {
    this.tmplCount = 0, this.shortenToLength(1);
  }
  _indexOfTagNames(T, R) {
    for (let a = this.stackTop; a >= 0; a--) if (T.has(this.tagIDs[a]) && this.treeAdapter.getNamespaceURI(this.items[a]) === R) return a;
    return -1;
  }
  clearBackTo(T, R) {
    let a = this._indexOfTagNames(T, R);
    this.shortenToLength(a + 1);
  }
  clearBackToTableContext() {
    this.clearBackTo(Mf0, VR.HTML);
  }
  clearBackToTableBodyContext() {
    this.clearBackTo(Lf0, VR.HTML);
  }
  clearBackToTableRowContext() {
    this.clearBackTo(Cf0, VR.HTML);
  }
  remove(T) {
    let R = this._indexOf(T);
    if (R >= 0) if (R === this.stackTop) this.pop();else this.items.splice(R, 1), this.tagIDs.splice(R, 1), this.stackTop--, this._updateCurrentElement(), this.handler.onItemPop(T, !1);
  }
  tryPeekProperlyNestedBodyElement() {
    return this.stackTop >= 1 && this.tagIDs[1] === sT.BODY ? this.items[1] : null;
  }
  contains(T) {
    return this._indexOf(T) > -1;
  }
  getCommonAncestor(T) {
    let R = this._indexOf(T) - 1;
    return R >= 0 ? this.items[R] : null;
  }
  isRootHtmlElementCurrent() {
    return this.stackTop === 0 && this.tagIDs[0] === sT.HTML;
  }
  hasInDynamicScope(T, R) {
    for (let a = this.stackTop; a >= 0; a--) {
      let e = this.tagIDs[a];
      switch (this.treeAdapter.getNamespaceURI(this.items[a])) {
        case VR.HTML:
          {
            if (e === T) return !0;
            if (R.has(e)) return !1;
            break;
          }
        case VR.SVG:
          {
            if (xfT.has(e)) return !1;
            break;
          }
        case VR.MATHML:
          {
            if (kfT.has(e)) return !1;
            break;
          }
      }
    }
    return !0;
  }
  hasInScope(T) {
    return this.hasInDynamicScope(T, Yw);
  }
  hasInListItemScope(T) {
    return this.hasInDynamicScope(T, df0);
  }
  hasInButtonScope(T) {
    return this.hasInDynamicScope(T, Ef0);
  }
  hasNumberedHeaderInScope() {
    for (let T = this.stackTop; T >= 0; T--) {
      let R = this.tagIDs[T];
      switch (this.treeAdapter.getNamespaceURI(this.items[T])) {
        case VR.HTML:
          {
            if (qY.has(R)) return !0;
            if (Yw.has(R)) return !1;
            break;
          }
        case VR.SVG:
          {
            if (xfT.has(R)) return !1;
            break;
          }
        case VR.MATHML:
          {
            if (kfT.has(R)) return !1;
            break;
          }
      }
    }
    return !0;
  }
  hasInTableScope(T) {
    for (let R = this.stackTop; R >= 0; R--) {
      if (this.treeAdapter.getNamespaceURI(this.items[R]) !== VR.HTML) continue;
      switch (this.tagIDs[R]) {
        case T:
          return !0;
        case sT.TABLE:
        case sT.HTML:
          return !1;
      }
    }
    return !0;
  }
  hasTableBodyContextInTableScope() {
    for (let T = this.stackTop; T >= 0; T--) {
      if (this.treeAdapter.getNamespaceURI(this.items[T]) !== VR.HTML) continue;
      switch (this.tagIDs[T]) {
        case sT.TBODY:
        case sT.THEAD:
        case sT.TFOOT:
          return !0;
        case sT.TABLE:
        case sT.HTML:
          return !1;
      }
    }
    return !0;
  }
  hasInSelectScope(T) {
    for (let R = this.stackTop; R >= 0; R--) {
      if (this.treeAdapter.getNamespaceURI(this.items[R]) !== VR.HTML) continue;
      switch (this.tagIDs[R]) {
        case T:
          return !0;
        case sT.OPTION:
        case sT.OPTGROUP:
          break;
        default:
          return !1;
      }
    }
    return !0;
  }
  generateImpliedEndTags() {
    while (mYT.has(this.currentTagId)) this.pop();
  }
  generateImpliedEndTagsThoroughly() {
    while (PfT.has(this.currentTagId)) this.pop();
  }
  generateImpliedEndTagsWithExclusion(T) {
    while (this.currentTagId !== T && PfT.has(this.currentTagId)) this.pop();
  }
}