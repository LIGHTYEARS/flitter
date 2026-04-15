class XzT {
  constructor() {
    this.resolve = () => null, this.reject = () => null, this.promise = new Promise((T, R) => {
      this.reject = R, this.resolve = T;
    });
  }
}