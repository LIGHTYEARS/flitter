function aXT(T) {
  let R = "",
    a = 0;
  while (a < T.length) {
    let e = T.charCodeAt(a);
    if (e === 27) {
      if (a++, a >= T.length) break;
      let t = T.charCodeAt(a);
      if (t === 91) {
        a++;
        while (a < T.length) {
          let r = T.charCodeAt(a);
          if (a++, r >= 64 && r <= 126) break;
        }
        continue;
      }
      if (t === 93) {
        a++;
        while (a < T.length) {
          let r = T.charCodeAt(a);
          if (r === 7) {
            a++;
            break;
          }
          if (r === 27 && a + 1 < T.length && T.charCodeAt(a + 1) === 92) {
            a += 2;
            break;
          }
          a++;
        }
        continue;
      }
      if (t === 80) {
        a++;
        while (a < T.length) {
          if (T.charCodeAt(a) === 27 && a + 1 < T.length && T.charCodeAt(a + 1) === 92) {
            a += 2;
            break;
          }
          a++;
        }
        continue;
      }
      if (t === 95 || t === 88 || t === 94) {
        a++;
        while (a < T.length) {
          if (T.charCodeAt(a) === 27 && a + 1 < T.length && T.charCodeAt(a + 1) === 92) {
            a += 2;
            break;
          }
          a++;
        }
        continue;
      }
      if (t === 78 || t === 79) {
        a += 2;
        continue;
      }
      if (t >= 64 && t <= 126) {
        a++;
        continue;
      }
      continue;
    }
    if (e === 127 || e === 8) {
      R = R.slice(0, -1), a++;
      continue;
    }
    if (e < 32) {
      a++;
      continue;
    }
    R += T[a], a++;
  }
  return R;
}