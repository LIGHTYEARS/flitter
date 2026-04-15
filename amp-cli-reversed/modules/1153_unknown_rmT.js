function nDR(T) {
  return `[${Object.getOwnPropertyNames(T).map(R => `"${R}"`).join(", ")}]`;
}
function lDR(T) {
  return Z5(T.name) || Z5(T.filename) || Z5(T.path)?.split(/[\\/]/).pop();
}
async function rmT(T) {
  let {
    response: R
  } = T;
  if (T.options.stream) {
    if (Pb("response", R.status, R.url, R.headers, R.body), T.options.__streamClass) return T.options.__streamClass.fromSSEResponse(R, T.controller);
    return eWT.fromSSEResponse(R, T.controller);
  }
  if (R.status === 204) return null;
  if (T.options.__binaryResponse) return R;
  let a = R.headers.get("content-type")?.split(";")[0]?.trim();
  if (a?.includes("application/json") || a?.endsWith("+json")) {
    let t = await R.json();
    return Pb("response", R.status, R.url, R.headers, t), t;
  }
  let e = await R.text();
  return Pb("response", R.status, R.url, R.headers, e), e;
}