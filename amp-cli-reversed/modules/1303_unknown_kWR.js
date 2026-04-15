function PWR(T) {
  return T === "-i" || T.startsWith("-i") || T === "--in-place" || T.startsWith("--in-place=");
}
function kWR(T) {
  let R = [],
    a = !1,
    e = !1;
  for (let t = 0; t < T.length; t++) {
    let r = T[t];
    if (!r) continue;
    if (r === "--") {
      for (let h of T.slice(t + 1)) if (a || e) R.push(h);else e = !0;
      break;
    }
    if (r.startsWith("-") && r !== "-") {
      if (r === "-i" || r === "--in-place") {
        if (T[t + 1] === "") t++;
        continue;
      }
      if (r.startsWith("-i") || r.startsWith("--in-place=")) continue;
      if (r === "-e" || r === "--expression" || r === "-f" || r === "--file") {
        a = !0, t++;
        continue;
      }
      continue;
    }
    if (a || e) R.push(r);else e = !0;
  }
  return R;
}