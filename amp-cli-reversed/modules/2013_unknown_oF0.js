async function oF0(T, R, a, e, t) {
  ua(e, T);
  let r = await X3(R, T);
  try {
    let h = hx(r.serverStatus),
      i = urT(T, h);
    if (!i && !t) d8("Must specify either --visibility or --support");
    if (i && t) d8("Cannot specify both --visibility and --support at the same time");
    if (i instanceof Error) d8(i.message);
    if (i) await r.threadService.updateThreadMeta(a, MA(i)), C9.write(oR.green(`\u2713 Thread ${a} visibility changed to ${i}.
`));
    if (t) {
      await NA(a, r);
      let c = typeof t === "string" ? t : void 0;
      await cbR(r.threadService, a, r.configService, c), C9.write(oR.green(`\u2713 Thread ${a} has been shared with Amp support. These thread reports will be aggregated and analysed.
`));
    }
    await r.asyncDispose(), process.exit(0);
  } catch (h) {
    await r.asyncDispose(), d8(`Failed to update thread: ${h instanceof Error ? h.message : String(h)}`);
  }
}