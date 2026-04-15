function h70(T, R, a, e) {
  let t = [],
    r;
  R++;
  while ((r = T[R++]) !== "]" && r) if (r === ",") throw new A8("expected value, found comma", {
    toml: T,
    ptr: R - 1
  });else if (r === "#") R = eW(T, R);else if (r !== " " && r !== "\t" && r !== `
` && r !== "\r") {
    let h = ErT(T, R - 1, "]", a - 1, e);
    t.push(h[0]), R = h[1];
  }
  if (!r) throw new A8("unfinished array encountered", {
    toml: T,
    ptr: R
  });
  return [t, R];
}