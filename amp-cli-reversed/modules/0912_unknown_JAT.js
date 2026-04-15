function JAT(T) {
  var R;
  let a = [];
  if (!((R = T === null || T === void 0 ? void 0 : T.config) === null || R === void 0 ? void 0 : R.tools)) return a;
  return T.config.tools.forEach((e, t) => {
    if (MP(e)) return;
    let r = e;
    if (r.functionDeclarations && r.functionDeclarations.length > 0) a.push(t);
  }), a;
}