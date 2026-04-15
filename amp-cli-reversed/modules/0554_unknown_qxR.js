function qxR(T) {
  for (let R = 0; R < T.length - 1; R++) {
    if (T[R] === 10 && T[R + 1] === 10) return R + 2;
    if (T[R] === 13 && T[R + 1] === 13) return R + 2;
    if (T[R] === 13 && T[R + 1] === 10 && R + 3 < T.length && T[R + 2] === 13 && T[R + 3] === 10) return R + 4;
  }
  return -1;
}