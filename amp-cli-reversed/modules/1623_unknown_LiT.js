function LiT(T, R, a, e) {
  let t = R.replaceAll("\\", "/"),
    r = (t.startsWith("/") ? t : `/${t}`).split("/").map(s => encodeURIComponent(s)).join("/"),
    h = a ? `:${a}${e ? `:${e}` : ""}` : "",
    i = `${T.urlScheme}://file${r}${h}`,
    c = nAR(i);
  if (c.status === 0) return !0;
  return J.debug(`Failed to open URI with ${T.ideName} URL scheme`, {
    schemeURI: i,
    status: c.status,
    stderr: c.stderr?.toString().trim()
  }), !1;
}