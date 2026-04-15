async function CyR(T, R, {
  metadata: a,
  resource: e,
  authorizationCode: t,
  fetchFn: r
} = {}) {
  let h = T.clientMetadata.scope,
    i;
  if (T.prepareTokenRequest) i = await T.prepareTokenRequest(h);
  if (!i) {
    if (!t) throw Error("Either provider.prepareTokenRequest() or authorizationCode is required");
    if (!T.redirectUrl) throw Error("redirectUrl is required for authorization_code flow");
    let s = await T.codeVerifier();
    i = dyR(t, s, T.redirectUrl);
  }
  let c = await T.clientInformation();
  return YMT(R, {
    metadata: a,
    tokenRequestParams: i,
    clientInformation: c ?? void 0,
    addClientAuthentication: T.addClientAuthentication,
    resource: e,
    fetchFn: r
  });
}