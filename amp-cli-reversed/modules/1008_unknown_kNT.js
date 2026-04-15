function aCR(T, R) {
  let a = T.indexOf(R);
  if (a !== -1) return [T.substring(0, a), R, T.substring(a + R.length)];
  return [T, "", ""];
}
async function kNT(T, R) {
  let {
      response: a,
      requestLogID: e,
      retryOfRequestLogID: t,
      startTime: r
    } = R,
    h = await (async () => {
      if (R.options.stream) {
        if (De(T).debug("response", a.status, a.url, a.headers, a.body), R.options.__streamClass) return R.options.__streamClass.fromSSEResponse(a, R.controller, T, R.options.__synthesizeEventData);
        return Ik.fromSSEResponse(a, R.controller, T, R.options.__synthesizeEventData);
      }
      if (a.status === 204) return null;
      if (R.options.__binaryResponse) return a;
      let i = a.headers.get("content-type")?.split(";")[0]?.trim();
      if (i?.includes("application/json") || i?.endsWith("+json")) {
        if (a.headers.get("content-length") === "0") return;
        let c = await a.json();
        return xNT(c, a);
      }
      return await a.text();
    })();
  return De(T).debug(`[${e}] response parsed`, j_({
    retryOfRequestLogID: t,
    url: a.url,
    status: a.status,
    body: h,
    durationMs: Date.now() - r
  })), h;
}