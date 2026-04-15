function Su0(T, R) {
  return Dw(T.fg, R.fg) && Dw(T.bg, R.bg) && T.bold === R.bold && T.italic === R.italic && T.underline === R.underline && T.strikethrough === R.strikethrough && T.reverse === R.reverse && T.dim === R.dim;
}