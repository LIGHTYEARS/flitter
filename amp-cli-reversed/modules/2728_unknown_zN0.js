function zN0(T) {
  let R = typeof T === "string" ? T : T.toString(),
    a = R.startsWith("file://") ? R.slice(7) : R,
    e = a.split("/").pop() || a,
    t = e.lastIndexOf(".");
  return t > 0 ? e.slice(0, t) : e;
}