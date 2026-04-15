function jyR(T) {
  let R = typeof T === "string" ? new URL(T) : T,
    a = R.pathname !== "/",
    e = [];
  if (!a) return e.push({
    url: new URL("/.well-known/oauth-authorization-server", R.origin),
    type: "oauth"
  }), e.push({
    url: new URL("/.well-known/openid-configuration", R.origin),
    type: "oidc"
  }), e;
  let t = R.pathname;
  if (t.endsWith("/")) t = t.slice(0, -1);
  return e.push({
    url: new URL(`/.well-known/oauth-authorization-server${t}`, R.origin),
    type: "oauth"
  }), e.push({
    url: new URL(`/.well-known/openid-configuration${t}`, R.origin),
    type: "oidc"
  }), e.push({
    url: new URL(`${t}/.well-known/openid-configuration`, R.origin),
    type: "oidc"
  }), e;
}