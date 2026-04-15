function F_0(T) {
  if (!Number.isSafeInteger(T)) throw TypeError(`Expected a code point, got \`${typeof T}\`.`);
}
function G_0(T, {
  ambiguousAsWide: R = !1
} = {}) {
  if (F_0(T), q_0(T) || z_0(T) || R && W_0(T)) return 2;
  return 1;
}
function bS(T, R = {}) {
  if (typeof T !== "string" || T.length === 0) return 0;
  let {
    ambiguousIsNarrow: a = !0,
    countAnsiEscapeCodes: e = !1
  } = R;
  if (!e) T = $VT(T);
  if (T.length === 0) return 0;
  let t = 0,
    r = {
      ambiguousAsWide: !a
    };
  for (let {
    segment: h
  } of V_0.segment(T)) {
    let i = h.codePointAt(0);
    if (i <= 31 || i >= 127 && i <= 159) continue;
    if (i >= 8203 && i <= 8207 || i === 65279) continue;
    if (i >= 768 && i <= 879 || i >= 6832 && i <= 6911 || i >= 7616 && i <= 7679 || i >= 8400 && i <= 8447 || i >= 65056 && i <= 65071) continue;
    if (i >= 55296 && i <= 57343) continue;
    if (i >= 65024 && i <= 65039) continue;
    if (X_0.test(h)) continue;
    if (K_0.default().test(h)) {
      t += 2;
      continue;
    }
    t += G_0(i, r);
  }
  return t;
}