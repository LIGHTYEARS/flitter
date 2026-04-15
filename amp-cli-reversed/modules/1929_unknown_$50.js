function $50(T) {
  let R = T.match(/'((?:[^'\\]|\\.)*)'/s);
  if (R) {
    let e = R[1];
    if (/\b(?:SELECT|INSERT|UPDATE|DELETE|WITH|CREATE|ALTER|DROP)\b/i.test(e)) return GgT(e);
  }
  let a = T.match(/"((?:[^"\\]|\\.)*)"/s);
  if (a) {
    let e = a[1].replace(/\\"/g, '"');
    if (/\b(?:SELECT|INSERT|UPDATE|DELETE|WITH|CREATE|ALTER|DROP)\b/i.test(e)) return GgT(e);
  }
  return T.trim();
}