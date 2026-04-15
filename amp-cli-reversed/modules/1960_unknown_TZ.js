function i2(T) {
  return T.type === "item" && "item" in T && "sourceIndex" in T;
}
function Tz0(T) {
  let R = ZS(T);
  if (R) return `${R.hidden ? "$$" : "$"}${R.args.cmd}`;
  return kr(T.content);
}
class TZ {
  _selectedUserMessageOrdinal = null;
  _editingMessageOrdinal = null;
  _isShowingRestoreConfirmation = !1;
  _isShowingEditConfirmation = !1;
  _pendingEditText = null;
  _pendingEditImageAttachments = [];
  _affectedFiles = [];
  _thinkingBlockStates = new Map();
  _denseViewItemStates = new Map();
  _denseViewItemTouched = new Set();
  _editingController = null;
  listeners = new Set();
  get selectedUserMessageOrdinal() {
    return this._selectedUserMessageOrdinal;
  }
  setSelectedUserMessageOrdinal(T) {
    if (this._selectedUserMessageOrdinal === T) return;
    this._selectedUserMessageOrdinal = T, this.notify();
  }
  get editingMessageOrdinal() {
    return this._editingMessageOrdinal;
  }
  get isShowingRestoreConfirmation() {
    return this._isShowingRestoreConfirmation;
  }
  setIsShowingRestoreConfirmation(T) {
    if (this._isShowingRestoreConfirmation === T) return;
    this._isShowingRestoreConfirmation = T, this.notify();
  }
  get isShowingEditConfirmation() {
    return this._isShowingEditConfirmation;
  }
  setIsShowingEditConfirmation(T) {
    if (this._isShowingEditConfirmation === T) return;
    this._isShowingEditConfirmation = T, this.notify();
  }
  get pendingEditText() {
    return this._pendingEditText;
  }
  setPendingEditText(T) {
    if (this._pendingEditText === T) return;
    this._pendingEditText = T, this.notify();
  }
  get pendingEditImageAttachments() {
    return this._pendingEditImageAttachments;
  }
  setPendingEditImageAttachments(T) {
    this._pendingEditImageAttachments = [...T], this.notify();
  }
  get affectedFiles() {
    return this._affectedFiles;
  }
  setAffectedFiles(T) {
    this._affectedFiles = [...T], this.notify();
  }
  get thinkingBlockStates() {
    return this._thinkingBlockStates;
  }
  get denseViewItemStates() {
    return this._denseViewItemStates;
  }
  get denseViewItemTouched() {
    return this._denseViewItemTouched;
  }
  setThinkingBlockState(T, R) {
    if (this._thinkingBlockStates.get(T) === R) return;
    this._thinkingBlockStates.set(T, R), this.notify();
  }
  clearThinkingBlockStates() {
    if (this._thinkingBlockStates.size === 0) return;
    this._thinkingBlockStates.clear(), this.notify();
  }
  setDenseViewItemState(T, R) {
    if (this._denseViewItemStates.get(T) === R) return;
    this._denseViewItemStates.set(T, R), this._denseViewItemTouched.add(T), this.notify();
  }
  setDenseViewItemTouched(T) {
    if (this._denseViewItemTouched.has(T)) return;
    this._denseViewItemTouched.add(T), this.notify();
  }
  clearDenseViewItemStates() {
    if (this._denseViewItemStates.size === 0) return;
    this._denseViewItemStates.clear(), this._denseViewItemTouched.clear(), this.notify();
  }
  get editingController() {
    return this._editingController;
  }
  startEditing(T, R) {
    if (this._editingMessageOrdinal === T && this._editingController) return;
    this._editingController?.dispose(), this._editingController = new wc(), this._editingController.text = R, this._editingMessageOrdinal = T, this.notify();
  }
  stopEditing() {
    if (this._editingMessageOrdinal === null && !this._editingController) return;
    this._editingMessageOrdinal = null, this._editingController?.dispose(), this._editingController = null, this.notify();
  }
  subscribe(T) {
    return this.listeners.add(T), () => this.listeners.delete(T);
  }
  notify() {
    for (let T of [...this.listeners]) T();
  }
  reset() {
    this._selectedUserMessageOrdinal = null, this._editingMessageOrdinal = null, this._isShowingRestoreConfirmation = !1, this._isShowingEditConfirmation = !1, this._pendingEditText = null, this._pendingEditImageAttachments = [], this._affectedFiles = [], this._thinkingBlockStates.clear(), this._denseViewItemStates.clear(), this._denseViewItemTouched.clear(), this._editingController?.dispose(), this._editingController = null, this.notify();
  }
}