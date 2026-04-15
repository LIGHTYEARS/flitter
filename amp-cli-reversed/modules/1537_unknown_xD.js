function qA(T) {
  let R = T.replace(/\/+$/, "");
  if (!R) return "";
  let a = R.lastIndexOf("/");
  return a === -1 ? R : R.slice(a + 1);
}
function xD(...T) {
  if (T.length === 0) return ".";
  let R = "";
  for (let h of T) if (h) if (R) R += "/" + h;else R = h;
  if (!R) return ".";
  let a = R.endsWith("/"),
    e = R.split("/").filter(Boolean),
    t = [];
  for (let h of e) if (h === "..") {
    if (t.length > 0 && t[t.length - 1] !== "..") t.pop();else if (!R.startsWith("/")) t.push("..");
  } else if (h !== ".") t.push(h);
  let r = R.startsWith("/") ? "/" + t.join("/") : t.join("/");
  if (!r) r = R.startsWith("/") ? "/" : ".";
  if (a && r !== "/" && r !== ".") r += "/";
  return r;
}