function c7R(T) {
  let R = T.endsWith(`
`),
    a = T.split(`
`).map(e => e + `
`);
  if (R) a.pop();else a.push(a.pop().slice(0, -1));
  return a;
}
class Cm {
  #T = !1;
  #R = [];
  async acquire() {
    return new Promise(T => {
      if (!this.#T) this.#T = !0, T();else this.#R.push(T);
    });
  }
  release() {
    if (this.#R.length > 0) this.#R.shift()?.();else this.#T = !1;
  }
}