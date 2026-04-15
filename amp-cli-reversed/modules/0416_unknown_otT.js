async function otT(T, R) {
  let a = {
    dataDir: T.dataDir || stT
  };
  if (!(await R.get("experimental.cli.nativeSecretsStorage.enabled", "global"))) return J.info("using file-based secrets storage", a), L_0(a);
  J.info("using native secrets storage");
  let e;
  try {
    e = await B_0();
  } catch (t) {
    throw J.error("failed to initialize native secrets storage", {
      error: t,
      platform: "darwin"
    }), Error("Native secret storage is not supported on this machine");
  }
  return await M_0(a, e), e;
}