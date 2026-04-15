async function eF0(T, R) {
  let a = T.ampURL.includes("localhost") || T.ampURL.includes("127.0.0.1");
  if (process.env.AMP_URL && !a) await T.settings.set("url", process.env.AMP_URL, "global"), C9.write(`Saving custom server URL to settings: ${process.env.AMP_URL}
`);else if (!Ob(T.ampURL)) C9.write(`Logging in to ${new URL(T.ampURL).hostname}
`);
  let e = process.env.AMP_API_KEY;
  if (e) C9.write(`API key found in environment variable, storing...
`), await R.set("apiKey", e, T.ampURL), C9.write(`API key successfully stored.
`), process.exit(0);
  let t = await T.secrets.get("apiKey", T.ampURL);
  if (t) {
    if (C9.write(`API key already configured: ${t.slice(0, 10)}...
`), !(await OtT("Do you want to log in again? [(y)es, (n)o]: "))) process.exit(0);
    C9.write(`
`);
  }
  let r = await r3R(T);
  process.exit(r ? 0 : 1);
}