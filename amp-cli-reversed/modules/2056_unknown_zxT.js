function zxT(T, R = "count") {
  let a = fXT(T);
  if (a.length === 1) {
    if (R === "filename") return a[0];
    return `1 ${o9(1, "file")}`;
  }
  let e = a.slice(0, NxT).join(", "),
    t = a.length - NxT;
  if (R === "count") return `${a.length} ${o9(a.length, "file")}`;
  if (t > 0) return `${e}, +${t} ${o9(t, "file")}`;
  return e;
}