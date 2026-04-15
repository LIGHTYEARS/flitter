function LAT(T, R = !1) {
  if (T == null) return "no-referrer";
  if (T = new URL(T), /^(about|blob|data):$/.test(T.protocol)) return "no-referrer";
  if (T.username = "", T.password = "", T.hash = "", R) T.pathname = "", T.search = "";
  return T;
}