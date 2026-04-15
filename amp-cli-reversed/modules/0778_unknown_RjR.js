function RjR(T) {
  let R = {},
    a = H(T, ["sdkHttpResponse"]);
  if (a != null) Y(R, ["sdkHttpResponse"], a);
  let e = H(T, ["files"]);
  if (e != null) {
    let t = e;
    if (Array.isArray(t)) t = t.map(r => {
      return r;
    });
    Y(R, ["files"], t);
  }
  return R;
}