function du0(T, R) {
  if (T.char === "\t") {
    if (T.width === mtT) return Ou0;
    return " ".repeat(Math.max(1, T.width));
  }
  if (R?.kittyExplicitWidth && T.width > 1) return `\x1B]66;w=${T.width};${T.char}\x1B\\`;
  return T.char;
}