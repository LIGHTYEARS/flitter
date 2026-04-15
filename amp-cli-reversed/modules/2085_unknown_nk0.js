function ok0(...T) {
  return {
    read: () => T,
    subscribe: () => () => {}
  };
}
function nk0() {
  let T = [],
    R = new Map(),
    a = new Set();
  function e() {
    for (let t of a) t();
  }
  return {
    get(t) {
      let r = R.get(t);
      return r !== void 0 ? T[r] : void 0;
    },
    set(...t) {
      let r = lk0(t) ? [t] : t;
      for (let [h, i] of r) {
        let c = R.get(h);
        if (c === void 0) R.set(h, T.length), T.push(i);else T[c] = i;
      }
      e();
    },
    replace(t, r, h) {
      let i = R.get(t);
      if (i === void 0) return;
      if (R.delete(t), R.set(r, i), h !== void 0) T[i] = h;
      e();
    },
    clear() {
      T.length = 0, R.clear(), e();
    },
    reader() {
      let t;
      return {
        read() {
          return T;
        },
        subscribe(r) {
          return t = r, a.add(t), () => {
            if (t) a.delete(t), t = void 0;
          };
        }
      };
    }
  };
}