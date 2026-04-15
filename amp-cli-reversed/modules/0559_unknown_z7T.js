function GxR(T, R) {
  let a = T.indexOf(R);
  if (a !== -1) return [T.substring(0, a), R, T.substring(a + R.length)];
  return [T, "", ""];
}
async function z7T(T, R) {
  let {
      response: a,
      requestLogID: e,
      retryOfRequestLogID: t,
      startTime: r
    } = R,
    h = await (async () => {
      if (R.options.stream) {
        if (It(T).debug("response", a.status, a.url, a.headers, a.body), R.options.__streamClass) return R.options.__streamClass.fromSSEResponse(a, R.controller);
        return kk.fromSSEResponse(a, R.controller);
      }
      if (a.status === 204) return null;
      if (R.options.__binaryResponse) return a;
      let i = a.headers.get("content-type")?.split(";")[0]?.trim();
      if (i?.includes("application/json") || i?.endsWith("+json")) {
        if (a.headers.get("content-length") === "0") return;
        let c = await a.json();
        return F7T(c, a);
      }
      return await a.text();
    })();
  return It(T).debug(`[${e}] response parsed`, $_({
    retryOfRequestLogID: t,
    url: a.url,
    status: a.status,
    body: h,
    durationMs: Date.now() - r
  })), h;
}