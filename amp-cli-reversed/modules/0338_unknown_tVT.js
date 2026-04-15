function tVT(T) {
  let R = [],
    a = T.split("\x00");
  for (let e = 0; e < a.length; e++) {
    let t = a[e];
    if (!t || t.length < 4) continue;
    let r = t.slice(0, 2),
      h = t.slice(3);
    if (!h) continue;
    let i = hp0(r);
    if (i === "renamed" || i === "copied") {
      let c = a[e + 1];
      if (c) {
        R.push({
          path: h,
          previousPath: c,
          changeType: i
        }), e += 1;
        continue;
      }
    }
    R.push({
      path: h,
      changeType: i
    });
  }
  return R.sort((e, t) => e.path.localeCompare(t.path));
}