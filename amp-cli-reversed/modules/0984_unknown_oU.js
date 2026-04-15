async function oU(T, R) {
  let {
      settings: a,
      secrets: e
    } = T,
    {
      url: t
    } = a,
    r = await e.getToken("apiKey", t);
  if (!r) throw Error("API key not found. You must provide an API key in settings.");
  let h = {
    GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
    GCLOUD_PROJECT: process.env.GCLOUD_PROJECT,
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS
  };
  delete process.env.GOOGLE_CLOUD_PROJECT, delete process.env.GCLOUD_PROJECT, delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  let i = Js(R?.serviceAuthToken),
    c = new L6T({
      apiKey: "placeholder",
      vertexai: !0,
      googleAuthOptions: {},
      httpOptions: {
        baseUrl: new URL("/api/provider/google", t).toString(),
        headers: {
          Authorization: "Bearer " + r,
          ...(i ?? {}),
          [yc]: R?.featureHeader ?? "amp.chat",
          ...(R?.messageId != null ? {
            [zA]: String(R.messageId)
          } : {}),
          ...Vs(R?.threadMeta)
        }
      }
    });
  for (let [s, A] of Object.entries(h)) if (A !== void 0) process.env[s] = A;
  return c;
}