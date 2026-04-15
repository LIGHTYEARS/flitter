function y1R(T) {
  if (T.startsWith("http://") || T.startsWith("https://")) try {
    let R = new URL(T);
    return R.username = "", R.password = "", R.toString();
  } catch {}
  return T;
}
function pFT(T) {
  let R = ["github.com", "gitlab.com"];
  T = y1R(T);
  let a = null,
    e = null,
    t = T.match(/^([^@]+)@([^:/]+)[:/](.+)$/);
  if (t && t[1] && t[2] && t[3]) {
    let r = t[1],
      h = t[2],
      i = t[3],
      c = r === "git",
      s = h === "github.com" && r.startsWith("org-");
    if (c || s) a = h, e = i;
  }
  if (!a || !e) {
    let r = T.match(/^https?:\/\/([^/]+)\/(.+)$/);
    if (r && r[1] && r[2]) a = r[1], e = r[2];
  }
  if (!a || !e) {
    let r = T.match(/^([^:]+):(.+)$/);
    if (r && r[1] && r[2]) a = r[1], e = r[2];
  }
  if (a && e && R.includes(a)) {
    let r = e.replace(/\.git$/, "").replace(/\/+$/, "").replace(/@[^/]+$/, "");
    return `https://${a}/${r}`.toLowerCase();
  }
  return T.replace(/\.git$/, "").replace(/\/+$/, "").replace(/@[^/]+$/, "").toLowerCase();
}