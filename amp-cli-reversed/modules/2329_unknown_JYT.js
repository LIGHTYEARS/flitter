function JYT(T) {
  return R;
  function R(a, e) {
    let t = -1,
      r;
    while (++t <= a.length) if (r === void 0) {
      if (a[t] && a[t][1].type === "data") r = t, t++;
    } else if (!a[t] || a[t][1].type !== "data") {
      if (t !== r + 2) a[r][1].end = a[t - 1][1].end, a.splice(r + 2, t - r - 2), t = r + 2;
      r = void 0;
    }
    return T ? T(a, e) : a;
  }
}