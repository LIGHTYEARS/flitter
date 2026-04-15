function Q$0(T) {
  let R = T.length;
  while (R--) if (T[R][0] === "enter" && T[R][1].type === "htmlFlow") break;
  if (R > 1 && T[R - 2][1].type === "linePrefix") T[R][1].start = T[R - 2][1].start, T[R + 1][1].start = T[R - 2][1].start, T.splice(R - 2, 2);
  return T;
}