function ruT(T, R) {
  return T.then(R).skip(T);
}
function AWR(T) {
  return qR.default((R, a) => {
    let e = R.indexOf(T, a);
    if (e !== -1) return qR.default.makeSuccess(e + T.length, R.substring(a, e));
    return qR.default.makeFailure(a, [T]);
  });
}