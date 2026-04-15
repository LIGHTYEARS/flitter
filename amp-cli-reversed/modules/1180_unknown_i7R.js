function Rw(T, R, a) {
  return gWT.diff(T, R, a);
}
function i7R(T, R) {
  if (R.stripTrailingCr) T = T.replace(/\r\n/g, `
`);
  let a = [],
    e = T.split(/(\n|\r\n)/);
  if (!e[e.length - 1]) e.pop();
  for (let t = 0; t < e.length; t++) {
    let r = e[t];
    if (t % 2 && !R.newlineIsToken) a[a.length - 1] += r;else a.push(r);
  }
  return a;
}