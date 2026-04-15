function PdR(T, R) {
  let a = T.indexOf(R);
  if (a !== -1) return [T.substring(0, a), R, T.substring(a + R.length)];
  return [T, "", ""];
}
async function kdR(T, R) {
  let {
      response: a,
      requestLogID: e,
      retryOfRequestLogID: t,
      startTime: r
    } = R,
    h = await (async () => {
      var i;
      if (R.options.stream) {
        if (gt(T).debug("response", a.status, a.url, a.headers, a.body), R.options.__streamClass) return R.options.__streamClass.fromSSEResponse(a, R.controller, T);
        return X6T.fromSSEResponse(a, R.controller, T);
      }
      if (a.status === 204) return null;
      if (R.options.__binaryResponse) return a;
      let c = a.headers.get("content-type"),
        s = (i = c === null || c === void 0 ? void 0 : c.split(";")[0]) === null || i === void 0 ? void 0 : i.trim();
      if ((s === null || s === void 0 ? void 0 : s.includes("application/json")) || (s === null || s === void 0 ? void 0 : s.endsWith("+json"))) {
        if (a.headers.get("content-length") === "0") return;
        return await a.json();
      }
      return await a.text();
    })();
  return gt(T).debug(`[${e}] response parsed`, v_({
    retryOfRequestLogID: t,
    url: a.url,
    status: a.status,
    body: h,
    durationMs: Date.now() - r
  })), h;
}