class CtT {
  shortcuts = new Map();
  constructor(T = new Map()) {
    this.shortcuts = new Map(T);
  }
  handleKeyEvent(T) {
    for (let [R, a] of this.shortcuts) if (R.accepts(T)) return a;
    return null;
  }
  addShortcut(T, R) {
    this.shortcuts.set(T, R);
  }
  removeShortcut(T) {
    return this.shortcuts.delete(T);
  }
  getAllShortcuts() {
    return new Map(this.shortcuts);
  }
  copyWith(T) {
    let R = new Map([...this.shortcuts, ...T]);
    return new CtT(R);
  }
}