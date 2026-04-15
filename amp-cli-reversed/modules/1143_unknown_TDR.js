async function TDR(T, R) {
  let a = new zHT(T),
    e = QMR.from(a),
    t = new FHT(e),
    r = {
      ...R.headers,
      ...a.headers,
      "Content-Length": a.contentLength
    };
  return {
    ...R,
    body: t,
    headers: r
  };
}