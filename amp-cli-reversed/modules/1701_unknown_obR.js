function sbR(T) {
  if (new Blob([T]).size <= nbR) return {
    body: T
  };
  return {
    body: lLT.gzip(T),
    headers: {
      "Content-Encoding": "gzip"
    }
  };
}
function obR() {
  return new Proxy({}, {
    get: (T, R) => {
      return async (...a) => {
        let e = a.at(1),
          t = a.at(0);
        if (!e?.config) throw Error("Internal API client requires configService in options. Call with { config: configService }");
        let {
            body: r,
            headers: h = {}
          } = sbR(JSON.stringify({
            method: R,
            params: t
          })),
          i = await fi("/api/internal?" + encodeURIComponent(R), {
            method: "POST",
            body: r,
            headers: h,
            signal: e?.signal
          }, e.config);
        if (!i.ok) throw Error(`API request for ${R} failed: ${i.status}`);
        return await i.json();
      };
    }
  });
}