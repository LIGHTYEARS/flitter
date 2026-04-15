function FD0(T, R) {
  if (T.type === "none") return T;
  return {
    ...T,
    alpha: R
  };
}
function VIT(T, R) {
  let a = R.isLight;
  if (T === "smart") return a ? LT.rgb(0, 140, 70) : LT.rgb(0, 255, 136);
  return a ? LT.rgb(180, 100, 0) : LT.rgb(255, 215, 0);
}
class zJT {
  _themeName;
  listeners = new Set();
  constructor(T = "terminal") {
    this._themeName = T;
  }
  get themeName() {
    return this._themeName;
  }
  setThemeName(T) {
    if (this._themeName === T) return;
    this._themeName = T, this.notify();
  }
  addListener(T) {
    this.listeners.add(T);
  }
  removeListener(T) {
    this.listeners.delete(T);
  }
  notify() {
    for (let T of this.listeners) T();
  }
}