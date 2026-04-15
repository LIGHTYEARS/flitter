function lzR(T) {
  for (let R = 0; R < T.length; R++) {
    let a = T[R];
    if (a === "-F" || a === "-f" || a === "-v") {
      R += 1;
      continue;
    }
    if (a.startsWith("-")) continue;
    let e = AzR(a);
    if (e) return {
      readRange: e
    };
  }
  return;
}