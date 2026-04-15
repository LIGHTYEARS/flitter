function $zR(T, R) {
  if (T !== "sed" && T !== "perl") return;
  if (T === "sed") {
    let t = R.filter(r => !r.startsWith("-"));
    return t.length >= 2 ? t[t.length - 1] : void 0;
  }
  let a = 0;
  while (a < R.length) {
    let t = R[a];
    if (t === "-e") {
      a += 2;
      continue;
    }
    if (t.startsWith("-")) {
      a++;
      continue;
    }
    break;
  }
  let e = R.slice(a);
  return e.length >= 1 ? e[e.length - 1] : void 0;
}