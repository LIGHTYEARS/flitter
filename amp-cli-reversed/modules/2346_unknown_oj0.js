function oj0(T) {
  let R = T.options.emphasis || "*";
  if (R !== "*" && R !== "_") throw Error("Cannot serialize emphasis with `" + R + "` for `options.emphasis`, expected `*`, or `_`");
  return R;
}