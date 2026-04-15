function Bj0(T, R, a) {
  return a.options.strong || "*";
}
function Nj0(T, R, a, e) {
  return a.safe(T.value, e);
}
function Uj0(T) {
  let R = T.options.ruleRepetition || 3;
  if (R < 3) throw Error("Cannot serialize rules with repetition `" + R + "` for `options.ruleRepetition`, expected `3` or more");
  return R;
}