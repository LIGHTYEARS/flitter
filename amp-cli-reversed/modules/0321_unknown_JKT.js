function JKT(T, R) {
  let a = zR.parse(T);
  if (a.scheme !== "file") throw new U_("INVALID_URI", "Only file:// URIs are supported");
  if (!a.path.startsWith("/")) throw new U_("INVALID_URI", "File URI path must be absolute");
  if (a.path.split("/").some(i => i === "..")) throw new U_("ACCESS_DENIED", "File URI resolves outside workspace root");
  let e = pg.posix.normalize(a.path).replace(/^\/+/u, "");
  if (e === ".." || e.startsWith("../")) throw new U_("ACCESS_DENIED", "File URI resolves outside workspace root");
  let t = pg.resolve(R),
    r = e.length > 0 ? pg.resolve(t, e) : t,
    h = pg.relative(t, r);
  if (h.startsWith("..") || pg.isAbsolute(h)) throw new U_("ACCESS_DENIED", "File URI resolves outside workspace root");
  return r;
}