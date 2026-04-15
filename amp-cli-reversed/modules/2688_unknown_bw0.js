function bw0(T) {
  if (T && T.indexOf(".") !== -1) {
    if (T = T.replace(/0+$/, ""), T === ".") T = "0";else if (T[0] === ".") T = "0" + T;else if (T[T.length - 1] === ".") T = T.substring(0, T.length - 1);
    return T;
  }
  return T;
}