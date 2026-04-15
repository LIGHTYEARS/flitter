async function S8(T) {
  if (J.info("Initializing CLI context", {
    argv: process.argv,
    nodeEnv: "production",
    hasAmpURL: Boolean(process.env.AMP_URL),
    hasAmpAPIKey: Boolean(process.env.AMP_API_KEY),
    hasSettingsFile: Boolean(process.env.AMP_SETTINGS_FILE)
  }), T.interactive) Be.write(`Warning: --interactive flag is deprecated. Interactive mode is now the default unless --execute is used or output is redirected.
`);
  let R = !!T.execute || !process.stdout.isTTY && !T.streamJson,
    a = process.stdout.isTTY && process.stderr.isTTY;
  J.info("Execution mode resolved", {
    executeMode: R,
    stdoutTTY: process.stdout.isTTY,
    stderrTTY: process.stderr.isTTY,
    streamJson: T.streamJson,
    executeFlag: T.execute
  });
  let e = await OHR({
    get: async i => {
      if (i !== tw) return;
      try {
        let c = await $5T(c2, "utf-8");
        return JSON.parse(c).installationID;
      } catch {
        return;
      }
    },
    set: async (i, c) => {
      if (i !== tw) return;
      await g5T(AA.dirname(c2), {
        recursive: !0
      }), await zUR(c2, JSON.stringify({
        installationID: c
      }, null, 2), {
        mode: 384
      });
    }
  }, {
    clientType: "cli",
    platform: JS()
  });
  ZlR(e);
  let t = await IVT({
    ...T,
    workspaceTrust: {
      current: !0,
      changes: P0T
    },
    getHook: process.env.AMP_URL ? (i, c) => {
      if (i === "url") return Promise.resolve(process.env.AMP_URL);
      return c();
    } : void 0
  });
  if (T.mcpConfig) {
    let i = await EC0(T.mcpConfig);
    t = CC0(t, i);
  }
  let r = AA.dirname(t.getSettingsFilePath());
  DXR(stT, r);
  let h = await t.get("url", "global");
  if (!h) h = Lr;
  if (J.info("Resolved Amp URL", {
    ampURL: h,
    settingsFile: t.getSettingsFilePath(),
    workspaceRoot: t.getWorkspaceRootPath()
  }), !Ob(h)) J.info("Targeting custom Amp server", {
    ampURL: h
  });
  return t = iHR(t), {
    executeMode: R,
    isTTY: a,
    ampURL: h,
    settings: t,
    secrets: BXT(await otT(T, t))
  };
}