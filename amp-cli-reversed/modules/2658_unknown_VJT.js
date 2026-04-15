function VJT(T, R) {
  let a = T[R],
    e = a === T[R + 1] && T[R + 1] === T[R + 2] ? T.slice(R, R + 3) : a;
  R += e.length - 1;
  do R = T.indexOf(e, ++R); while (R > -1 && a !== "'" && XD0(T, R));
  if (R > -1) {
    if (R += e.length, e.length > 1) {
      if (T[R] === a) R++;
      if (T[R] === a) R++;
    }
  }
  return R;
}