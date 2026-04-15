function Yf0(T) {
  let R = T.tagID;
  return R === sT.FONT && T.attrs.some(({
    name: a
  }) => a === gb.COLOR || a === gb.SIZE || a === gb.FACE) || Xf0.has(R);
}
function fYT(T) {
  for (let R = 0; R < T.attrs.length; R++) if (T.attrs[R].name === zf0) {
    T.attrs[R].name = Ff0;
    break;
  }
}
function IYT(T) {
  for (let R = 0; R < T.attrs.length; R++) {
    let a = Gf0.get(T.attrs[R].name);
    if (a != null) T.attrs[R].name = a;
  }
}
function YtT(T) {
  for (let R = 0; R < T.attrs.length; R++) {
    let a = Kf0.get(T.attrs[R].name);
    if (a) T.attrs[R].prefix = a.prefix, T.attrs[R].name = a.name, T.attrs[R].namespace = a.namespace;
  }
}