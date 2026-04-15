function wGR(T) {
  let R = atob(T),
    a = new Uint8Array(R.length);
  for (let e = 0; e < R.length; e++) a[e] = R.charCodeAt(e);
  return new TextDecoder().decode(a);
}
function BGR(T, R) {
  let a = "",
    e = 0;
  while (e < T.length) {
    let t = T.charAt(e);
    if (t === "*") {
      if (T.charAt(e + 1) === "*") {
        if (T.charAt(e + 2) === "/") a += "(?:.+/)?", e += 3;else a += ".*", e += 2;
      } else a += "[^/]*", e++;
    } else if (t === "?") a += "[^/]", e++;else if (t === "{") {
      let r = T.indexOf("}", e);
      if (r !== -1) {
        let h = T.slice(e + 1, r).split(",");
        a += `(?:${h.map(e4).join("|")})`, e = r + 1;
      } else a += e4(t), e++;
    } else if (t === "[") {
      let r = T.indexOf("]", e);
      if (r !== -1) a += T.slice(e, r + 1), e = r + 1;else a += e4(t), e++;
    } else a += e4(t), e++;
  }
  return new RegExp(`^${a}$`).test(R);
}