function wr(T, R, a) {
  if (T !== ~~T || T < R || T > a) throw Error(DA + T);
}
function IS(T, R, a, e) {
  var t, r, h, i;
  for (r = T[0]; r >= 10; r /= 10) --R;
  if (--R < 0) R += s9, t = 0;else t = Math.ceil((R + 1) / s9), R %= s9;
  if (r = Ka(10, s9 - R), i = T[t] % r | 0, e == null) {
    if (R < 3) {
      if (R == 0) i = i / 100 | 0;else if (R == 1) i = i / 10 | 0;
      h = a < 4 && i == 99999 || a > 3 && i == 49999 || i == 50000 || i == 0;
    } else h = (a < 4 && i + 1 == r || a > 3 && i + 1 == r / 2) && (T[t + 1] / r / 100 | 0) == Ka(10, R - 2) - 1 || (i == r / 2 || i == 0) && (T[t + 1] / r / 100 | 0) == 0;
  } else if (R < 4) {
    if (R == 0) i = i / 1000 | 0;else if (R == 1) i = i / 100 | 0;else if (R == 2) i = i / 10 | 0;
    h = (e || a < 4) && i == 9999 || !e && a > 3 && i == 4999;
  } else h = ((e || a < 4) && i + 1 == r || !e && a > 3 && i + 1 == r / 2) && (T[t + 1] / r / 1000 | 0) == Ka(10, R - 3) - 1;
  return h;
}