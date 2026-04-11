// Module: filter-stack
// Original: jvT
// Type: CJS (RT wrapper)
// Exports: FilterStack, FilterStackFactory
// Category: util

// Module: jvT (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.FilterStackFactory = T.FilterStack = void 0));
  class R {
    constructor(e) {
      this.filters = e;
    }
    sendMetadata(e) {
      let t = e;
      for (let r = 0; r < this.filters.length; r++)
        t = this.filters[r].sendMetadata(t);
      return t;
    }
    receiveMetadata(e) {
      let t = e;
      for (let r = this.filters.length - 1; r >= 0; r--)
        t = this.filters[r].receiveMetadata(t);
      return t;
    }
    sendMessage(e) {
      let t = e;
      for (let r = 0; r < this.filters.length; r++)
        t = this.filters[r].sendMessage(t);
      return t;
    }
    receiveMessage(e) {
      let t = e;
      for (let r = this.filters.length - 1; r >= 0; r--)
        t = this.filters[r].receiveMessage(t);
      return t;
    }
    receiveTrailers(e) {
      let t = e;
      for (let r = this.filters.length - 1; r >= 0; r--)
        t = this.filters[r].receiveTrailers(t);
      return t;
    }
    push(e) {
      this.filters.unshift(...e);
    }
    getFilters() {
      return this.filters;
    }
  }
  T.FilterStack = R;
  class a {
    constructor(e) {
      this.factories = e;
    }
    push(e) {
      this.factories.unshift(...e);
    }
    clone() {
      return new a([...this.factories]);
    }
    createFilter() {
      return new R(this.factories.map((e) => e.createFilter()));
    }
  }
  T.FilterStackFactory = a;
};
