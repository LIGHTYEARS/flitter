class Ib {
  element;
  widget;
  mediaQuery;
  parent;
  constructor(T, R, a = void 0, e = null) {
    this.element = T, this.widget = R, this.mediaQuery = a, this.parent = e;
  }
  findAncestorElementOfType(T) {
    let R = this.element.parent;
    while (R) {
      if (R instanceof T) return R;
      R = R.parent;
    }
    return null;
  }
  findAncestorWidgetOfType(T) {
    return this.element.findAncestorWidgetOfType(T);
  }
  dependOnInheritedWidgetOfExactType(T) {
    return this.element.dependOnInheritedWidgetOfExactType(T);
  }
  findAncestorStateOfType(T) {
    let R = this.element.parent;
    while (R) {
      if ("state" in R && R.state instanceof T) return R.state;
      R = R.parent;
    }
    return null;
  }
  findRenderObject() {
    if ("renderObject" in this.element) {
      let T = this.element.renderObject;
      return T instanceof vH ? T : void 0;
    }
    return;
  }
}