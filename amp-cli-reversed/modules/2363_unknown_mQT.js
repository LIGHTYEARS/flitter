function mQT(T) {
  let R = T.options.rule || "*";
  if (R !== "*" && R !== "-" && R !== "_") throw Error("Cannot serialize rules with `" + R + "` for `options.rule`, expected `*`, `-`, or `_`");
  return R;
}