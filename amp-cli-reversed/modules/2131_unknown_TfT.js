function Kk0(T) {
  let R = [];
  for (let a of T) if (R.push(a.value), a.subparams) R.push(...a.subparams);
  return R;
}
function TfT(T, R) {
  if (R + 1 >= T.length) return {
    color: null,
    nextIndex: R
  };
  let a = T[R + 1];
  if (a === 2) {
    let e = R + 2,
      t = T.length - e;
    if (t >= 4) {
      let r = T[e + 1] ?? 0,
        h = T[e + 2] ?? 0,
        i = T[e + 3] ?? 0;
      return {
        color: LT.rgb(r, h, i),
        nextIndex: R + 5
      };
    } else if (t >= 3) {
      let r = T[e] ?? 0,
        h = T[e + 1] ?? 0,
        i = T[e + 2] ?? 0;
      return {
        color: LT.rgb(r, h, i),
        nextIndex: R + 4
      };
    }
    return {
      color: null,
      nextIndex: R + 1
    };
  } else if (a === 5) {
    let e = R + 2,
      t = T.length - e;
    if (t >= 2) {
      let r = T[e + 1] ?? 0;
      return {
        color: LT.index(r),
        nextIndex: R + 4
      };
    } else if (t >= 1) {
      let r = T[e] ?? 0;
      return {
        color: LT.index(r),
        nextIndex: R + 2
      };
    }
    return {
      color: null,
      nextIndex: R + 1
    };
  }
  return {
    color: null,
    nextIndex: R + 1
  };
}