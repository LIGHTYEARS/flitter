function YJT(T) {
  if (!T.startsWith("#") || T.length !== 7 && T.length !== 9) throw Error(`Invalid hex color: ${T}`);
  let R = parseInt(T.slice(1, 3), 16),
    a = parseInt(T.slice(3, 5), 16),
    e = parseInt(T.slice(5, 7), 16),
    t = T.length === 9 ? parseInt(T.slice(7, 9), 16) / 255 : void 0;
  return {
    r: R,
    g: a,
    b: e,
    a: t
  };
}