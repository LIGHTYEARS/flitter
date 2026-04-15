function sS0() {
  let T = [],
    R = {
      run: a,
      use: e
    };
  return R;
  function a(...t) {
    let r = -1,
      h = t.pop();
    if (typeof h !== "function") throw TypeError("Expected function as last argument, not " + h);
    i(null, ...t);
    function i(c, ...s) {
      let A = T[++r],
        l = -1;
      if (c) {
        h(c);
        return;
      }
      while (++l < t.length) if (s[l] === null || s[l] === void 0) s[l] = t[l];
      if (t = s, A) oS0(A, i)(...s);else h(null, ...s);
    }
  }
  function e(t) {
    if (typeof t !== "function") throw TypeError("Expected `middelware` to be a function, not " + t);
    return T.push(t), R;
  }
}