function vu0(T, R, a) {
  let e = "";
  if (!Dw(T.fg, R.fg)) {
    if (T.fg === void 0 && R.fg !== void 0) e += t9 + "39m";else e += SxT(T.fg, !0, a);
    R.fg = T.fg;
  }
  if (!Dw(T.bg, R.bg)) {
    let t = T.bg?.type === "none",
      r = R.bg?.type === "none";
    if ((T.bg === void 0 || t) && R.bg !== void 0 && !r) e += t9 + "49m";else if (!t) e += SxT(T.bg, !1, a);
    R.bg = T.bg;
  }
  if (T.bold !== R.bold) {
    if (e += T.bold ? t9 + "1m" : t9 + "22m", R.bold = T.bold, !T.bold && T.dim) e += t9 + "2m";
  }
  if (T.italic !== R.italic) e += T.italic ? t9 + "3m" : t9 + "23m", R.italic = T.italic;
  if (T.underline !== R.underline) {
    if (a?.underlineSupport !== "none") e += T.underline ? t9 + "4m" : t9 + "24m";
    R.underline = T.underline;
  }
  if (T.strikethrough !== R.strikethrough) e += T.strikethrough ? t9 + "9m" : t9 + "29m", R.strikethrough = T.strikethrough;
  if (T.reverse !== R.reverse) e += T.reverse ? t9 + "7m" : t9 + "27m", R.reverse = T.reverse;
  if (T.dim !== R.dim) {
    if (e += T.dim ? t9 + "2m" : t9 + "22m", R.dim = T.dim, !T.dim && T.bold) e += t9 + "1m";
  }
  return e;
}