function fC0(T) {
  return "url" in T;
}
function IC0(T) {
  let R = T.clientId ?? T.client_id,
    a = T.authUrl ?? T.authorizationUrl ?? T.auth_url ?? T.authorization_url,
    e = T.tokenUrl ?? T.token_url;
  if (!R || !a || !e) return;
  return {
    clientId: R,
    clientSecret: T.clientSecret ?? T.client_secret,
    authUrl: a,
    tokenUrl: e,
    scopes: T.scopes,
    redirectUrl: T.redirectUrl ?? T.redirect_url
  };
}