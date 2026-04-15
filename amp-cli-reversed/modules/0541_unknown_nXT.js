class nXT {
  _hits = [];
  get hits() {
    return this._hits;
  }
  add(T) {
    this._hits.push(T);
  }
  addWithPaintOffset(T, R, a) {
    let e = {
      x: a.x - R.x,
      y: a.y - R.y
    };
    this.add({
      target: T,
      localPosition: e
    });
  }
  addMouseTarget(T, R) {}
}