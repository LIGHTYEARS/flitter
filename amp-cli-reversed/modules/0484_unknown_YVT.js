function a9(T = " ", R = {}, a = 1, e) {
  return {
    char: T,
    style: {
      ...R
    },
    width: a,
    hyperlink: e
  };
}
function dm0(T, R) {
  return T.char === R.char && T.width === R.width && YVT(T.style, R.style) && gH(T.hyperlink, R.hyperlink);
}
function YVT(T, R) {
  return PxT(T.fg, R.fg) && PxT(T.bg, R.bg) && T.bold === R.bold && T.italic === R.italic && T.underline === R.underline && T.strikethrough === R.strikethrough && T.reverse === R.reverse && T.dim === R.dim;
}