function Z4R(T, R) {
  let a = T.pipe(L9(e => gh((async () => {
    let t = await e.secrets.getToken("apiKey", e.settings.url);
    return {
      url: e.settings.url,
      apiKey: t,
      directRouting: e.settings["internal.fireworks.directRouting"]
    };
  })())), E9((e, t) => e.url === t.url && e.apiKey === t.apiKey && e.directRouting === t.directRouting), JR(({
    url: e,
    apiKey: t,
    directRouting: r
  }) => {
    if (!t) throw Error("API key not found. You must provide an API key in settings.");
    let h = {
      ...R
    };
    if (r) h["x-fireworks-direct-routing"] = "true";
    return new _9({
      apiKey: t,
      baseURL: new URL("/api/provider/fireworks/v1", e).toString(),
      defaultHeaders: h
    });
  }));
  return R ? a : a.pipe(f3({
    shouldCountRefs: !0
  }));
}