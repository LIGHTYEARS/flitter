function B70(T, R = Go.Legacy) {
  return D70(T, R);
}
function N70(T) {
  return w70(T, Go.Strict);
}
function tTR(T, R) {
  let a = [],
    e = R.exec(T);
  while (e) {
    let t = [];
    t.startIndex = R.lastIndex - e[0].length;
    let r = e.length;
    for (let h = 0; h < r; h++) t.push(e[h]);
    a.push(t), e = R.exec(T);
  }
  return a;
}