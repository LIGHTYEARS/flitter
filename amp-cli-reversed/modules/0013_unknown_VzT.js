function e4(T) {
  return T.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function VzT(T) {
  let R = T.map(a => a.type === "dir" ? `${a.name}/` : a.name);
  return R.sort((a, e) => {
    let t = a.endsWith("/"),
      r = e.endsWith("/");
    if (t && !r) return -1;
    if (!t && r) return 1;
    return a.localeCompare(e);
  }), R;
}