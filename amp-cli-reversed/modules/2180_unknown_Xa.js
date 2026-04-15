class Xa {
  base;
  app;
  constructor({
    base: T,
    app: R
  }) {
    this.base = T, this.app = R;
  }
  get colors() {
    return this.base.colorScheme;
  }
  static default() {
    return new Xa({
      base: Gt.default(),
      app: yS.default()
    });
  }
  static fromBaseTheme(T, R = "dark") {
    return new Xa({
      base: T,
      app: yS.default(R)
    });
  }
}