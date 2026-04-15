async function p70(T) {
  if (!T) return null;
  let R = T.getCurrentThread?.();
  if (R) return R;
  return await m0(T.thread$).catch(() => null);
}
async function _70(T, R, a) {
  let e = null,
    t = {
      ...T,
      setExitNotice: P => {
        e = P;
      }
    },
    r = await t.configService.getLatest(),
    h = r.settings["terminal.animation"] === !1,
    i = {};
  if (h) i.queryOptions = {
    animationDisabled: !0
  };
  d9.instance.tuiInstance.setOptions(i);
  let c = await s70();
  for (let P of c) qD0(P.dirName, P.name, P.palette, P.path);
  let s = r.settings["terminal.theme"] ?? "terminal",
    A = t.threadPool,
    l = !1;
  if (l) process.env.AMP_INSPECTOR_ENABLED = "1";
  let o = new aA(l, 1000, R.inspectorPort),
    n = a(t),
    p = new kn({
      value: R,
      child: n
    }),
    _ = new UJT({
      configService: t.configService,
      child: p
    }),
    m = new DJT({
      configService: t.configService,
      child: _
    }),
    b = new zJT(s),
    y = t.configService.config.pipe(JR(P => P.settings["terminal.theme"]), E9()).subscribe(P => {
      b.setThemeName(P ?? "terminal");
    }),
    u = new FJT({
      controller: b,
      child: m
    });
  try {
    await T1T(u, {
      onRootElementMounted: P => {
        let k = Number(process.hrtime.bigint() - Ac0) / 1e6;
        if (J.info(`Boot complete: ${k.toFixed(0)}ms to interactive`), l) o.start(P), LD0(P);
      }
    });
  } finally {
    if (y.unsubscribe(), l) o.stop(), MD0();
    let P = await m0(A.threadHandles$).catch(() => null),
      k = await p70(P);
    if (k && k.messages.length > 0) {
      let x = `${R.ampURL.replace(/\/$/, "")}/threads/${k.id}`;
      NXT(k, x, R.stdout, e);
    } else if (e) R.stdout.write(`${e}
`);
    if (R.stdout.write(JVT("")), b70()) R.stdout.write($u0());
  }
}