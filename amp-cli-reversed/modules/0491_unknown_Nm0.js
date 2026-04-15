function Lm0() {
  return `amp-${++Cm0}`;
}
function QVT(T, R) {
  return {
    uri: T,
    id: R ?? Lm0()
  };
}
function Mm0(T) {
  return `\x1B]8;id=${T.id};${T.uri}\x1B\\`;
}
function _Y() {
  return "\x1B]8;;\x1B\\";
}
function Dm0(T) {
  return /\p{Extended_Pictographic}/u.test(T);
}
function wm0(T) {
  let R = String.fromCodePoint(T);
  return !/\p{Emoji_Presentation}/u.test(R);
}
function Bm0(T) {
  return /\p{M}/u.test(T);
}
function Nm0(T, R = !0) {
  if (!T) return 0;
  let a = Array.from(T);
  if (R) {
    let e = 0;
    for (let t = 0; t < a.length; t++) {
      let r = a[t];
      if (!r) continue;
      let h = r.codePointAt(0);
      if (!h) continue;
      let i = xxT(h);
      if (i !== 0) {
        if (t + 1 < a.length) {
          let c = a[t + 1]?.codePointAt(0);
          if (c === 65038) i = 1;else if (c === 65039) i = 2;
        }
        if (e === 0) {
          e = i;
          break;
        }
      }
    }
    return e;
  } else {
    let e = 0;
    for (let t of a) {
      if (!t) continue;
      let r = t.codePointAt(0);
      if (!r) continue;
      e += xxT(r);
    }
    return e;
  }
}