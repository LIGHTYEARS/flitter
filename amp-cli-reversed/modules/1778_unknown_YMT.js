function dyR(T, R, a) {
  return new URLSearchParams({
    grant_type: "authorization_code",
    code: T,
    code_verifier: R,
    redirect_uri: String(a)
  });
}
async function YMT(T, {
  metadata: R,
  tokenRequestParams: a,
  clientInformation: e,
  addClientAuthentication: t,
  resource: r,
  fetchFn: h
}) {
  let i = R?.token_endpoint ? new URL(R.token_endpoint) : new URL("/token", T),
    c = new Headers({
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    });
  if (r) a.set("resource", r.href);
  if (t) await t(c, a, i, R);else if (e) {
    let A = R?.token_endpoint_auth_methods_supported ?? [],
      l = myR(e, A);
    uyR(l, e, c, a);
  }
  let s = await (h ?? fetch)(i, {
    method: "POST",
    headers: c,
    body: a
  });
  if (!s.ok) throw await XMT(s);
  return FMT.parse(await s.json());
}