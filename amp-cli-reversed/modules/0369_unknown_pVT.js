async function pVT(T, R) {
  let a = await T.getLatest(),
    e = R ?? (await a.secrets.getToken("apiKey", a.settings.url));
  if (!e) throw Error("API key required. Please run `amp login` first.");
  return e;
}