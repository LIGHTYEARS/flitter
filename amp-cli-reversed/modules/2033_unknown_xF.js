function xF(T) {
  let R = T.filter(t => t.changeType === "untracked").length,
    a = T.length - R,
    e = [];
  if (a > 0) e.push(`${a} changed ${o9(a, "file")}`);
  if (R > 0) e.push(`${R} untracked ${o9(R, "file")}`);
  return e.length > 0 ? e.join(" and ") : "0 files";
}