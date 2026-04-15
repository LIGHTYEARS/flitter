function Sv(T, R, a) {
  try {
    let e = a ? $m0(a) : "plain";
    if (e === "plain" || !zP.default.languages[e]) return [{
      content: T
    }];
    let t = zP.default.tokenize(T, zP.default.languages[e]);
    return Om0(t, R);
  } catch (e) {
    return [{
      content: T
    }];
  }
}