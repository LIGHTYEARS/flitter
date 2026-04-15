class Bl {
  constructor() {
    throw TypeError("Illegal constructor");
  }
  get desiredSize() {
    if (!HC(this)) throw WC("desiredSize");
    return IHT(this._controlledTransformStream);
  }
  enqueue(T) {
    if (!HC(this)) throw WC("enqueue");
    xHT(this, T);
  }
  error(T) {
    if (!HC(this)) throw WC("error");
    var R;
    R = T, V7(this._controlledTransformStream, R);
  }
  terminate() {
    if (!HC(this)) throw WC("terminate");
    (function (T) {
      let R = T._controlledTransformStream;
      Y7(R) && fHT(R);
      let a = TypeError("TransformStream terminated");
      jU(R, a);
    })(this);
  }
}