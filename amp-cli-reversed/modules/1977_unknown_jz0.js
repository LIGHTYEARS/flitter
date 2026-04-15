function jz0(T, R) {
  T.command("usage").description("Show your current Amp usage and credit balance").action(async (a, e) => {
    let t = e.optsWithGlobals(),
      r = await R(t),
      h = await r.settings.get("proxy"),
      i = nHR({
        settings: {
          url: r.ampURL,
          proxy: h
        },
        secrets: {
          getToken: (s, A) => r.secrets.get(s, A)
        }
      }),
      c = await N3.userDisplayBalanceInfo({}, {
        config: i
      });
    if (!c.ok) {
      if (c.error.code === "auth-required") process.stderr.write(oR.red("Error: ") + "You must be logged in to view usage. Run `amp login` first.\n"), process.exit(1);
      process.stderr.write(oR.red("Error: ") + c.error.message + `
`), process.exit(1);
    }
    process.stdout.write((await vz0(c.result.displayText)) + `
`), process.exit(0);
  });
}