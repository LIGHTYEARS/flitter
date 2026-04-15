function EDR(T, R) {
  let a = T.pipe(L9(e => gh((async () => {
    let t = await e.secrets.getToken("apiKey", e.settings.url);
    return {
      url: e.settings.url,
      apiKey: t
    };
  })())), E9((e, t) => e.url === t.url && e.apiKey === t.apiKey), JR(({
    url: e,
    apiKey: t
  }) => {
    if (!t) throw Error("API key not found. You must provide an API key in settings.");
    return new bWT({
      apiKey: t,
      baseURL: new URL("/api/provider/cerebras", e).toString(),
      defaultHeaders: R
    });
  }));
  return R ? a : a.pipe(f3({
    shouldCountRefs: !0
  }));
}