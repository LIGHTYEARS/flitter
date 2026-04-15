function xbR(T, R) {
  let a = [];
  if (typeof R === "string" || typeof R === "boolean" || typeof R === "number" || R === null) a.push(`--${T} ${Ll(R)}`);else if (Array.isArray(R)) {
    let e = R.every(t => typeof t === "string" || typeof t === "boolean" || typeof t === "number" || t === null);
    if (!T.includes(".") && e) for (let t of R) a.push(`--${T} ${Ll(t)}`);else for (let t = 0; t < R.length; t++) if (typeof R[t] === "object" && R[t] !== null) {
      let r = HD({
        [`${T}.${t}`]: R[t]
      });
      for (let {
        path: h,
        value: i
      } of r) a.push(`--${h} ${Ll(i)}`);
    } else a.push(`--${T}.${t} ${Ll(R[t])}`);
  } else if (typeof R === "object" && R !== null) {
    let e = HD({
      [T]: R
    });
    for (let {
      path: t,
      value: r
    } of e) a.push(`--${t} ${Ll(r)}`);
  }
  return a;
}