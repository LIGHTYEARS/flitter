async function qkT(T, R) {
  let a = await T.configService.getLatest(),
    e = T.apiKey ?? (await a.secrets.getToken("apiKey", a.settings.url)),
    t = T.workerURL ?? process.env.AMP_WORKER_URL ?? Pi(a.settings.url);
  return {
    apiKey: e,
    workerURL: t,
    signal: R
  };
}