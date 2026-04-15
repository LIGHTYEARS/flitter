function An(T) {
  return xLT.test(T);
}
function Kf(T) {
  return typeof T === "string" ? T : T.toString();
}
function TG(T, R, a) {
  if (!kL.has(T)) kL.set(T, new Map());
  kL.get(T).set(R, a);
}
function fr(T, R, a = 0, e = !1) {
  let t = `readUInt${R}${e ? "BE" : "LE"}`;
  return vLT[t](T, a);
}
function vbR(T, R) {
  if (T.length - R < 4) return;
  let a = se(T, R);
  if (T.length - R < a) return;
  return {
    name: V8(T, 4 + R, 8 + R),
    offset: R,
    size: a
  };
}
function Jh(T, R, a) {
  while (a < T.length) {
    let e = vbR(T, a);
    if (!e) break;
    if (e.name === R) return e;
    a += e.size > 0 ? e.size : 8;
  }
}
function ToT(T, R) {
  let a = T[R];
  return a === 0 ? 256 : a;
}
function RoT(T, R) {
  let a = RmR + R * amR;
  return {
    height: ToT(T, a + 1),
    width: ToT(T, a)
  };
}
function jbR(T, R) {
  let a = R + hmR;
  return [V8(T, R, a), se(T, a)];
}
function SbR(T) {
  let R = jLT[T];
  return {
    width: R,
    height: R,
    type: T
  };
}
function ObR(T) {
  return Qy(T, 2, 6) === imR;
}
function dbR(T, R) {
  return {
    height: qD(T, R),
    width: qD(T, R + 2)
  };
}
function EbR(T, R) {
  let a = RG + 8,
    e = fr(T, 16, a, R);
  for (let t = 0; t < e; t++) {
    let r = a + lmR + t * poT,
      h = r + poT;
    if (r > T.length) return;
    let i = T.slice(r, h);
    if (fr(i, 16, 0, R) === 274) {
      if (fr(i, 16, 2, R) !== 3) return;
      if (fr(i, 32, 4, R) !== 1) return;
      return fr(i, 16, 8, R);
    }
  }
}