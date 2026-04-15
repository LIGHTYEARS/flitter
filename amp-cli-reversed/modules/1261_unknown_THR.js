function Ku(T, R) {
  let a = "";
  for (let e = 0; e < R; e++) a += T;
  return a;
}
function THR(T, R) {
  let a = 0,
    e = 0,
    t = R.tabSize || 4;
  while (a < T.length) {
    let r = T.charAt(a);
    if (r === Zh[1]) e++;else if (r === "\t") e += t;else break;
    a++;
  }
  return Math.floor(e / t);
}