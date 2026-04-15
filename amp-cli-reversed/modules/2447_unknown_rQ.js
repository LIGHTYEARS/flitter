function tQ(T) {
  return T.replace("image/", "").toUpperCase();
}
function rQ(T) {
  let R;
  try {
    R = new URL(T);
  } catch {
    return !1;
  }
  let a = R.hostname.toLowerCase();
  if (!Nd0.has(a)) return !1;
  return R.pathname.toLowerCase().startsWith("/attachments/");
}