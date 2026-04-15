function Em0(T, R, a, e, t) {
  let r = {
    ...R
  };
  if (T.fg) if (R.fg) r.fg = D4(T.fg, R.fg, t);else r.fg = D4(T.fg, e, t);
  if (T.bg) {
    let h = uS(T.bg);
    if (T.bg.type === "none" || h === 0) {
      if (R.bg) r.bg = R.bg;
    } else if (R.bg) r.bg = D4(T.bg, R.bg, t);else r.bg = D4(T.bg, a, t);
  }
  if (T.bold !== void 0) r.bold = T.bold;
  if (T.italic !== void 0) r.italic = T.italic;
  if (T.underline !== void 0) r.underline = T.underline;
  if (T.strikethrough !== void 0) r.strikethrough = T.strikethrough;
  if (T.reverse !== void 0) r.reverse = T.reverse;
  if (T.dim !== void 0) r.dim = T.dim;
  return r;
}