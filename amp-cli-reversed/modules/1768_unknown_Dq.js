async function Dq(T, {
  serverUrl: R,
  authorizationCode: a,
  scope: e,
  resourceMetadataUrl: t,
  fetchFn: r
}) {
  let h, i;
  try {
    if (h = await IyR(R, {
      resourceMetadataUrl: t
    }, r), h.authorization_servers && h.authorization_servers.length > 0) i = h.authorization_servers[0];
  } catch {}
  if (!i) i = new URL("/", R);
  let c = await fyR(R, T, h),
    s = await SyR(i, {
      fetchFn: r
    }),
    A = await Promise.resolve(T.clientInformation());
  if (!A) {
    if (a !== void 0) throw Error("Existing OAuth client information is required when exchanging an authorization code");
    let m = s?.client_id_metadata_document_supported === !0,
      b = T.clientMetadataUrl;
    if (b && !xyR(b)) throw new Xg(`clientMetadataUrl must be a valid HTTPS URL with a non-root pathname, got: ${b}`);
    if (m && b) A = {
      client_id: b
    }, await T.saveClientInformation?.(A);else {
      if (!T.saveClientInformation) throw Error("OAuth client information must be saveable for dynamic registration");
      let y = await LyR(i, {
        metadata: s,
        clientMetadata: T.clientMetadata,
        fetchFn: r
      });
      await T.saveClientInformation(y), A = y;
    }
  }
  let l = !T.redirectUrl;
  if (a !== void 0 || l) {
    let m = await CyR(T, i, {
      metadata: s,
      resource: c,
      authorizationCode: a,
      fetchFn: r
    });
    return await T.saveTokens(m), "AUTHORIZED";
  }
  let o = await T.tokens();
  if (o?.refresh_token) try {
    let m = await EyR(i, {
      metadata: s,
      clientInformation: A,
      refreshToken: o.refresh_token,
      resource: c,
      addClientAuthentication: T.addClientAuthentication,
      fetchFn: r
    });
    return await T.saveTokens(m), "AUTHORIZED";
  } catch (m) {
    if (!(m instanceof Na) || m instanceof Y_) ;else throw m;
  }
  let n = T.state ? await T.state() : void 0,
    {
      authorizationUrl: p,
      codeVerifier: _
    } = await OyR(i, {
      metadata: s,
      clientInformation: A,
      state: n,
      redirectUrl: T.redirectUrl,
      scope: e || h?.scopes_supported?.join(" ") || T.clientMetadata.scope,
      resource: c
    });
  return await T.saveCodeVerifier(_), await T.redirectToAuthorization(p), "REDIRECT";
}