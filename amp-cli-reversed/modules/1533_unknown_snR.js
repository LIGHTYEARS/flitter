function snR(T) {
  let R;
  for (let a = 0; a < T.length; a++) {
    let e = T.charCodeAt(a);
    if (e === 35 || e === 63) {
      if (R === void 0) R = T.substring(0, a);
      R += b0T[e];
    } else if (R !== void 0) R += T[a];
  }
  return R !== void 0 ? R : T;
}