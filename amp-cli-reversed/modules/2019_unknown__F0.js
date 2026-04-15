async function _F0(T, R, a) {
  ua(a, T);
  let e = await X3(R, T),
    t = hx(e.serverStatus),
    r = urT(T, t);
  if (r instanceof Error) d8(r.message);
  try {
    let h = Eh();
    await (await e.threadService.exclusiveSyncReadWriter(h)).asyncDispose(), await dS(e.threadService, h), await OS(h, "interactive");
    let i = await UeT(R.settings, process.cwd(), t, r);
    if (i instanceof Error) d8(i.message);
    if (i) await e.threadService.updateThreadMeta(h, MA(i));
    C9.write(`${h}
`), await e.asyncDispose(), process.exit(0);
  } catch (h) {
    Be.write(`Error creating thread: ${h instanceof Error ? h.message : String(h)}
`), await e.asyncDispose(), process.exit(1);
  }
}