function C3(T) {
  let {
    r: R,
    g: a,
    b: e,
    a: t
  } = YJT(T);
  return LT.rgb(R, a, e, t);
}
function TL(T, R) {
  if (T.type === "none") return T;
  return {
    ...T,
    alpha: R
  };
}
function l70(T) {
  let {
    r: R,
    g: a,
    b: e
  } = YJT(T);
  return (0.299 * R + 0.587 * a + 0.114 * e) / 255;
}
function A70(T) {
  let R = T.colors,
    a = T.ui || {},
    e = T.syntax || {},
    t = R.background === "none",
    r = T.mode === "light" || T.mode === void 0 && !t && l70(R.background) > 0.5,
    h = C3(R.foreground),
    i = C3(R.primary),
    c = C3(R.warning),
    s = a.muted_foreground ? C3(a.muted_foreground) : TL(h, 0.6),
    A = a.border ? C3(a.border) : TL(h, 0.4);
  return {
    background: t ? LT.none() : C3(R.background),
    foreground: h,
    cursor: a.cursor ? C3(a.cursor) : h,
    mutedForeground: s,
    border: A,
    selection: a.selection ? C3(a.selection) : TL(A, 0.3),
    primary: i,
    secondary: R.secondary ? C3(R.secondary) : i,
    accent: R.accent ? C3(R.accent) : i,
    success: C3(R.success),
    warning: c,
    info: R.info ? C3(R.info) : i,
    destructive: C3(R.destructive),
    copyHighlight: a.copy_highlight ? C3(a.copy_highlight) : c,
    tableBorder: a.table_border ? C3(a.table_border) : TL(A, 0.4),
    isLight: r,
    syntaxHighlight: {
      keyword: e.keyword ? C3(e.keyword) : i,
      string: e.string ? C3(e.string) : C3(R.success),
      number: e.number ? C3(e.number) : c,
      comment: e.comment ? C3(e.comment) : s,
      function: e.function ? C3(e.function) : i,
      variable: e.variable ? C3(e.variable) : h,
      type: e.type ? C3(e.type) : c,
      operator: e.operator ? C3(e.operator) : h
    }
  };
}