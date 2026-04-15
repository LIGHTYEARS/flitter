function bdR(T, R) {
  for (let a = R !== null && R !== void 0 ? R : 0; a < T.length; a++) {
    if (T[a] === 10) return {
      preceding: a,
      index: a + 1,
      carriage: !1
    };
    if (T[a] === 13) return {
      preceding: a,
      index: a + 1,
      carriage: !0
    };
  }
  return null;
}