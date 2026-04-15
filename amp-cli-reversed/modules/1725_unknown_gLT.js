function KbR(T) {
  let R = V8(T, 0, 2),
    a = fr(T, 16, 2, R === "MM");
  return {
    isBigEndian: R === "MM",
    isBigTiff: a === 43
  };
}
function VbR(T, R) {
  let a = fr(T, 16, 4, R),
    e = fr(T, 16, 6, R);
  if (a !== 8 || e !== 0) throw TypeError("Invalid BigTIFF header");
}
function XbR(T) {
  return {
    height: 1 + eoT(T, 7),
    width: 1 + eoT(T, 4)
  };
}
function YbR(T) {
  return {
    height: 1 + ((T[4] & 15) << 10 | T[3] << 2 | (T[2] & 192) >> 6),
    width: 1 + ((T[2] & 63) << 8 | T[1])
  };
}
function QbR(T) {
  return {
    height: aoT(T, 8) & 16383,
    width: aoT(T, 6) & 16383
  };
}
function ZbR(T) {
  let R = T[0],
    a = dLT.get(R);
  if (a && Dj.get(a).validate(T)) return a;
  return OLT.find(e => Dj.get(e).validate(T));
}
function gLT(T) {
  let R = ZbR(T);
  if (typeof R < "u") {
    if (ELT.disabledTypes.indexOf(R) > -1) throw TypeError(`disabled file type: ${R}`);
    let a = Dj.get(R).calculate(T);
    if (a !== void 0) {
      if (a.type = a.type ?? R, a.images && a.images.length > 1) {
        let e = a.images.reduce((t, r) => {
          return r.width * r.height > t.width * t.height ? r : t;
        }, a.images[0]);
        a.width = e.width, a.height = e.height;
      }
      return a;
    }
  }
  throw TypeError(`unsupported file type: ${R}`);
}