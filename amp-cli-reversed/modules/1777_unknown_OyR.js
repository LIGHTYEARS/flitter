async function OyR(T, {
  metadata: R,
  clientInformation: a,
  redirectUrl: e,
  scope: t,
  state: r,
  resource: h
}) {
  let i;
  if (R) {
    if (i = new URL(R.authorization_endpoint), !R.response_types_supported.includes(Bq)) throw Error(`Incompatible auth server: does not support response type ${Bq}`);
    if (R.code_challenge_methods_supported && !R.code_challenge_methods_supported.includes(Nq)) throw Error(`Incompatible auth server: does not support code challenge method ${Nq}`);
  } else i = new URL("/authorize", T);
  let c = await syR(),
    s = c.code_verifier,
    A = c.code_challenge;
  if (i.searchParams.set("response_type", Bq), i.searchParams.set("client_id", a.client_id), i.searchParams.set("code_challenge", A), i.searchParams.set("code_challenge_method", Nq), i.searchParams.set("redirect_uri", String(e)), r) i.searchParams.set("state", r);
  if (t) i.searchParams.set("scope", t);
  if (t?.includes("offline_access")) i.searchParams.append("prompt", "consent");
  if (h) i.searchParams.set("resource", h.href);
  return {
    authorizationUrl: i,
    codeVerifier: s
  };
}