function cM0() {
  return !process.stdin.isTTY && process.stdin.readable;
}
function sM0(T) {
  let R = {};
  for (let a = 0; a < T.length; a++) {
    let e = T[a];
    if (e?.startsWith("--")) {
      let t = e.slice(2),
        r = T[a + 1];
      if (r && !r.startsWith("--")) {
        if (R[t]) {
          if (Array.isArray(R[t])) R[t].push(r);else R[t] = [R[t], r];
        } else R[t] = r;
        a++;
      }
    }
  }
  return R;
}