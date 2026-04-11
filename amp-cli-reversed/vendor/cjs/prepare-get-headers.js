// Module: prepare-get-headers
// Original: riR
// Type: CJS (RT wrapper)
// Exports: prepareGetHeaders
// Category: util

// Module: RiR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.prepareSend = void 0));
  var R = n0(),
    a = $9(),
    e = qT("http"),
    t = qT("https");
  function r(h, i) {
    let c = new URL(h),
      s = Object.assign({
        method: "POST",
        headers: { "Content-Type": "application/json", ...i },
      });
    return function (A, l) {
      if (A.length === 0)
        return (
          R.diag.debug("Zipkin send with empty spans"),
          l({ code: a.ExportResultCode.SUCCESS })
        );
      let { request: o } = c.protocol === "http:" ? e : t,
        n = o(c, s, (_) => {
          let m = "";
          (_.on("data", (b) => {
            m += b;
          }),
            _.on("end", () => {
              let b = _.statusCode || 0;
              if (
                (R.diag.debug(`Zipkin response status code: ${b}, body: ${m}`),
                b < 400)
              )
                return l({ code: a.ExportResultCode.SUCCESS });
              else
                return l({
                  code: a.ExportResultCode.FAILED,
                  error: Error(`Got unexpected status code from zipkin: ${b}`),
                });
            }));
        });
      n.on("error", (_) => {
        return l({ code: a.ExportResultCode.FAILED, error: _ });
      });
      let p = JSON.stringify(A);
      (R.diag.debug(`Zipkin request payload: ${p}`),
        n.write(p, "utf8"),
        n.end());
    };
  }
  T.prepareSend = r;
};
