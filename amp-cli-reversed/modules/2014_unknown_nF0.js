async function nF0(T, R, a, e, t) {
  ua(t, T);
  let r = await X3(R, T);
  try {
    let h = await BKT(a, e, r.configService);
    C9.write(oR.green(`\u2713 Thread ${a} labels: ${h.join(", ")}
`)), await r.asyncDispose(), process.exit(0);
  } catch (h) {
    if (await r.asyncDispose(), h instanceof GR) d8(h.userMessage);
    d8(`Failed to label thread: ${h instanceof Error ? h.message : String(h)}`);
  }
}