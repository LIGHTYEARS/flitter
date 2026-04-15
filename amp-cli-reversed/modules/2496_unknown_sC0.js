function cC0(T, R) {
  let a = sC0(T, R),
    e = oC0(T.message.toLowerCase(), R);
  return Math.max(a, e);
}
function sC0(T, R) {
  let a = T.hash.toLowerCase(),
    e = T.shortHash.toLowerCase();
  if (e === R) return 1000;
  if (e.startsWith(R)) return 900;
  if (a.startsWith(R)) return 850;
  if (a.includes(R) || e.includes(R)) return 400;
  return 0;
}