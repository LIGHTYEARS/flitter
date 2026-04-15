function p$(T) {
  if (T && typeof T === "object" && "message" in T && typeof T.message === "string") return T.message;else return String(T);
}
function F1R() {
  return async () => {};
}
function X1R(T) {
  let R = "",
    a = Object.entries(T);
  for (let e = 0; e < a.length; e++) {
    let [t, r] = a[e],
      h = !1,
      i;
    if (r == null) h = !0, i = "";else i = r.toString();
    if (i.length > 512 && t !== "msg" && t !== "error") i = `${i.slice(0, 512)}...`;
    let c = i.indexOf(" ") > -1 || i.indexOf("=") > -1,
      s = i.indexOf('"') > -1 || i.indexOf("\\") > -1;
    if (i = i.replace(/\n/g, "\\n"), s) i = i.replace(/["\\]/g, "\\$&");
    if (c || s) i = `"${i}"`;
    if (i === "" && !h) i = '""';
    if (Z1R.enableColor) {
      let A = "\x1B[2m";
      if (t === "level") {
        let l = S_[i],
          o = K1R[l];
        if (o) A = o;
      } else if (t === "msg") A = "\x1B[32m";else if (t === "trace") A = "\x1B[34m";
      R += `\x1B[0m\x1B[1m${t}\x1B[0m\x1B[2m=\x1B[0m${A}${i}${V1R}`;
    } else R += `${t}=${i}`;
    if (e !== a.length - 1) R += " ";
  }
  return R;
}