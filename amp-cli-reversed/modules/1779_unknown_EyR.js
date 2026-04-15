async function EyR(T, {
  metadata: R,
  clientInformation: a,
  refreshToken: e,
  resource: t,
  addClientAuthentication: r,
  fetchFn: h
}) {
  let i = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: e
    }),
    c = await YMT(T, {
      metadata: R,
      tokenRequestParams: i,
      clientInformation: a,
      addClientAuthentication: r,
      resource: t,
      fetchFn: h
    });
  return {
    refresh_token: e,
    ...c
  };
}