class Xk {
  _noise2D;
  _seed;
  constructor(T) {
    this._seed = T ?? Date.now(), this._noise2D = By0.makeNoise2D(this._seed);
  }
  get seed() {
    return this._seed;
  }
  sample(T, R, a, e = 1) {
    return (this._noise2D(T / wxT, R / wxT + a * e) + 1) * 0.5;
  }
  sampleEdge(T, R, a, e, t = 1) {
    let r = T - 1,
      h = R / 2 + a * (R / 2);
    return this.sample(r, h, e, t);
  }
  getColor(T, R, a) {
    return bXT(T, R, a);
  }
}