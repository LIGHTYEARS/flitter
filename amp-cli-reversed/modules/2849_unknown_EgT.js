function EgT(T) {
  if (!T) return "";
  let R = T.match(/^refs\/(heads|tags)\/(.+)$/);
  if (R) return R[2] || "";
  let a = T.match(/^(\^)?([0-9a-f]{7,40})(\^\d+|\^+|~\d*)?$/i);
  if (a) {
    let e = a[1] || "",
      t = a[2] || "",
      r = a[3] || "";
    return e + t.slice(0, 7) + r;
  }
  return T;
}