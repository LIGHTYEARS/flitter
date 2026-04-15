function MzR(T, R) {
  let a = [];
  for (let e of T.split("\x00")) {
    if (!e || e.length < 4) continue;
    let t = e.slice(0, 2),
      r = e.slice(3);
    if (t === "??" || t.includes("M") || t.includes("A")) a.push(CzR.join(R, r));
  }
  return a;
}