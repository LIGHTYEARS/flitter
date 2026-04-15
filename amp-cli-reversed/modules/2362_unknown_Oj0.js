function Oj0(T) {
  let R = T.options.bulletOrdered || ".";
  if (R !== "." && R !== ")") throw Error("Cannot serialize items with `" + R + "` for `options.bulletOrdered`, expected `.` or `)`");
  return R;
}