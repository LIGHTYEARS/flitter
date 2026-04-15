function iIT(T, R, a) {
  if (R === 0) return !1;
  let e = 0,
    t = Math.min(R, aB + TQ),
    r = Math.min(t, aB);
  if (R >= 3 && T[0] === 239 && T[1] === 187 && T[2] === 191) return !1;
  if (R >= 4 && T[0] === 0 && T[1] === 0 && T[2] === 254 && T[3] === 255) return !1;
  if (R >= 4 && T[0] === 255 && T[1] === 254 && T[2] === 0 && T[3] === 0) return !1;
  if (R >= 4 && T[0] === 132 && T[1] === 49 && T[2] === 149 && T[3] === 51) return !1;
  if (t >= 5 && T.slice(0, 5).toString() === "%PDF-") return !0;
  if (R >= 2 && T[0] === 254 && T[1] === 255) return !1;
  if (R >= 2 && T[0] === 255 && T[1] === 254) return !1;
  if (a?.encoding) return !hIT(T, R, a.encoding);
  let h = ZO0(T, R);
  if (h) return !hIT(T, R, h);
  for (let i = 0; i < r; i++) if (T[i] === 0) return !0;else if ((T[i] < 7 || T[i] > 14) && (T[i] < 32 || T[i] > 127)) {
    if (T[i] >= 192 && T[i] <= 223 && i + 1 < t) {
      if (i++, T[i] >= 128 && T[i] <= 191) continue;
    } else if (T[i] >= 224 && T[i] <= 239 && i + 2 < t) {
      if (i++, T[i] >= 128 && T[i] <= 191 && T[i + 1] >= 128 && T[i + 1] <= 191) {
        i++;
        continue;
      }
    } else if (T[i] >= 240 && T[i] <= 247 && i + 3 < t) {
      if (i++, T[i] >= 128 && T[i] <= 191 && T[i + 1] >= 128 && T[i + 1] <= 191 && T[i + 2] >= 128 && T[i + 2] <= 191) {
        i += 2;
        continue;
      }
    }
    if (e++, i >= 32 && e * 100 / r > 10) return !0;
  }
  if (e * 100 / r > 10) return !0;
  if (e > 1 && Td0(T, r)) return !0;
  return !1;
}