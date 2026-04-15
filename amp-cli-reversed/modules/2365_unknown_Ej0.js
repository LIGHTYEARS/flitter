function Ej0(T) {
  let R = T.options.listItemIndent || "one";
  if (R !== "tab" && R !== "one" && R !== "mixed") throw Error("Cannot serialize items with `" + R + "` for `options.listItemIndent`, expected `tab`, `one`, or `mixed`");
  return R;
}