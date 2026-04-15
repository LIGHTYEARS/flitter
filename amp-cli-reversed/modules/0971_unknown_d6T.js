async function d6T(T, R, a) {
  var e, t;
  let r = 0,
    h = 0,
    i = new fk(new Response()),
    c = "upload";
  r = T.size;
  while (h < r) {
    let s = Math.min(Z6T, r - h),
      A = T.slice(h, h + s);
    if (h + s >= r) c += ", finalize";
    let l = 0,
      o = TNT;
    while (l < J6T) {
      if (i = await a.request({
        path: "",
        body: A,
        httpMethod: "POST",
        httpOptions: {
          apiVersion: "",
          baseUrl: R,
          headers: {
            "X-Goog-Upload-Command": c,
            "X-Goog-Upload-Offset": String(h),
            "Content-Length": String(s)
          }
        }
      }), (e = i === null || i === void 0 ? void 0 : i.headers) === null || e === void 0 ? void 0 : e[Yl]) break;
      l++, await E6T(o), o = o * RNT;
    }
    if (h += s, ((t = i === null || i === void 0 ? void 0 : i.headers) === null || t === void 0 ? void 0 : t[Yl]) !== "active") break;
    if (r <= h) throw Error("All content has been uploaded, but the upload status is not finalized.");
  }
  return i;
}