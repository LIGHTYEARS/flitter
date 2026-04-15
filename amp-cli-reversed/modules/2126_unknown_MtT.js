class MtT {
  detach() {}
  toString() {
    return `${this.constructor.name}#${this.hashCode()}`;
  }
  hashCode() {
    return Math.random().toString(36).substr(2, 9);
  }
}