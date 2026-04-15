async function tF0(T) {
  if (process.env.AMP_API_KEY) C9.write(`API key found in environment variable AMP_API_KEY, unset first before running 'amp logout'
`), process.exit(0);
  if (!(await T.secrets.get("apiKey", T.ampURL))) {
    if (Ob(T.ampURL)) C9.write(`Already logged out.
`);else C9.write(`Already logged out from ${new URL(T.ampURL).hostname}.
`);
    process.exit(0);
  }
  if (await T.secrets.set("apiKey", "", T.ampURL), !process.env.AMP_URL) await T.settings.delete("url", "global");
  if (Ob(T.ampURL)) C9.write(`Successfully logged out.
`);else C9.write(`Successfully logged out from ${new URL(T.ampURL).hostname}.
`);
  process.exit(0);
}