function $P(T, R, a) {
  let e = a ? `/threads/${R}/${a}` : `/threads/${R}`;
  return new URL(e, T);
}
async function fi(T, R, a) {
  let e = await a.getLatest(R?.signal ?? void 0),
    t = await ALT(T, R, e);
  return fetch(t);
}
async function ibR(T, R, a) {
  let e = await ALT(R, a, T);
  return fetch(e);
}
async function ALT(T, R, a) {
  if (T.startsWith("http:") || T.startsWith("https:")) throw Error("input must be a path, not an absolute URL");
  if (!T.startsWith("/")) throw Error("pathAndQuery must start with /");
  let e = a.settings.url;
  if (!e) throw Error("amp.url is not set");
  let t = await a.secrets.getToken("apiKey", e);
  hbR({
    proxy: a.settings.proxy
  });
  let r = new URL(T, e);
  return new Request(r, {
    ...R,
    duplex: "half",
    headers: {
      "Content-Type": "application/json",
      ...R?.headers,
      ...Xs(),
      ...(t ? {
        Authorization: `Bearer ${t}`
      } : {})
    }
  });
}