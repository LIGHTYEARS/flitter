function e70(T, R, a) {
  let e = T.slice(R, a),
    t = e.indexOf("#");
  if (t > -1) eW(T, t), e = e.slice(0, t);
  return [e.trimEnd(), t];
}
function ErT(T, R, a, e, t) {
  if (e === 0) throw new A8("document contains excessively nested structures. aborting.", {
    toml: T,
    ptr: R
  });
  let r = T[R];
  if (r === "[" || r === "{") {
    let [c, s] = r === "[" ? h70(T, R, e, t) : r70(T, R, e, t);
    if (a) {
      if (s = ws(T, s), T[s] === ",") s++;else if (T[s] !== a) throw new A8("expected comma or end of structure", {
        toml: T,
        ptr: s
      });
    }
    return [c, s];
  }
  let h;
  if (r === '"' || r === "'") {
    h = VJT(T, R);
    let c = XJT(T, R, h);
    if (a) {
      if (h = ws(T, h), T[h] && T[h] !== "," && T[h] !== a && T[h] !== `
` && T[h] !== "\r") throw new A8("unexpected character encountered", {
        toml: T,
        ptr: h
      });
      h += +(T[h] === ",");
    }
    return [c, h];
  }
  h = YD0(T, R, ",", a);
  let i = e70(T, R, h - +(T[h - 1] === ","));
  if (!i[0]) throw new A8("incomplete key-value declaration: no value specified", {
    toml: T,
    ptr: R
  });
  if (a && i[1] > -1) h = ws(T, R + i[1]), h += +(T[h] === ",");
  return [a70(i[0], T, R, t), h];
}