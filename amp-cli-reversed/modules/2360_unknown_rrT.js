function jj0() {
  return "[";
}
function rrT(T) {
  let R = T.options.bullet || "*";
  if (R !== "*" && R !== "+" && R !== "-") throw Error("Cannot serialize items with `" + R + "` for `options.bullet`, expected `*`, `+`, or `-`");
  return R;
}