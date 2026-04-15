function nJT(T) {
  return String(T.s * T.s / 0);
}
function VM(T, R) {
  var a, e, t;
  if ((a = R.indexOf(".")) > -1) R = R.replace(".", "");
  if ((e = R.search(/e/i)) > 0) {
    if (a < 0) a = e;
    a += +R.slice(e + 1), R = R.substring(0, e);
  } else if (a < 0) a = R.length;
  for (e = 0; R.charCodeAt(e) === 48; e++);
  for (t = R.length; R.charCodeAt(t - 1) === 48; --t);
  if (R = R.slice(e, t), R) {
    if (t -= e, T.e = a = a - e - 1, T.d = [], e = (a + 1) % s9, a < 0) e += s9;
    if (e < t) {
      if (e) T.d.push(+R.slice(0, e));
      for (t -= s9; e < t;) T.d.push(+R.slice(e, e += s9));
      R = R.slice(e), e = s9 - R.length;
    } else e -= t;
    for (; e--;) R += "0";
    if (T.d.push(+R), g9) {
      if (T.e > T.constructor.maxE) T.d = null, T.e = NaN;else if (T.e < T.constructor.minE) T.e = 0, T.d = [0];
    }
  } else T.e = 0, T.d = [0];
  return T;
}