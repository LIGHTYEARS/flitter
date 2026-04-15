function iM(T, R, a, e, t, r, h) {
  if (typeof h === "function") h = {
    callback: h
  };
  if (!(h === null || h === void 0 ? void 0 : h.callback)) {
    let i = bmT(T, R, a, e, t, r, h);
    if (!i) return;
    return $X(i, h === null || h === void 0 ? void 0 : h.headerOptions);
  } else {
    let {
      callback: i
    } = h;
    bmT(T, R, a, e, t, r, Object.assign(Object.assign({}, h), {
      callback: c => {
        if (!c) i(void 0);else i($X(c, h.headerOptions));
      }
    }));
  }
}