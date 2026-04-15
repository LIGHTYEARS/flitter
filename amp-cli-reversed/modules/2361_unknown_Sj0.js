function Sj0(T) {
  let R = rrT(T),
    a = T.options.bulletOther;
  if (!a) return R === "*" ? "-" : "*";
  if (a !== "*" && a !== "+" && a !== "-") throw Error("Cannot serialize items with `" + a + "` for `options.bulletOther`, expected `*`, `+`, or `-`");
  if (a === R) throw Error("Expected `bullet` (`" + R + "`) and `bulletOther` (`" + a + "`) to be different");
  return a;
}