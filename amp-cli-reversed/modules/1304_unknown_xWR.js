function xWR(T, R) {
  if (!T || typeof T === "string" || !("files" in T) || !Array.isArray(T.files)) return null;
  let a = [];
  for (let e of T.files) {
    if (typeof e?.uri === "string" && e.uri.startsWith("file://")) {
      let t = e.uri;
      a.push(zR.parse(t));
      continue;
    }
    if (typeof e?.path === "string") {
      let t = WU(e.path, void 0, R);
      if (t) a.push(t);
    }
  }
  return gaT(a);
}