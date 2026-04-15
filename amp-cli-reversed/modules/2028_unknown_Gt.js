class Gt {
  colorScheme;
  constructor({
    colorScheme: T
  }) {
    this.colorScheme = T;
  }
  static default() {
    return new Gt({
      colorScheme: Vk.default()
    });
  }
  static withRgb(T) {
    return new Gt({
      colorScheme: Vk.fromRgb(T)
    });
  }
}