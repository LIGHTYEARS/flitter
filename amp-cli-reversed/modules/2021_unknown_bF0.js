async function bF0(T, R, a, e) {
  ua(a, T);
  let t = await X3(R, T);
  try {
    let r = hx(t.serverStatus);
    if (!(r?.team?.billingMode === "enterprise" || r?.team?.billingMode === "enterprise.selfserve")) d8(`Default visibility is only configurable in enterprise workspaces.
`);
    if (e) {
      let c = Cc0(e, r);
      if (c instanceof Error) d8(c.message);
      if (!c) d8(`Visibility value must be provided.
`);
      if (c === "private" && r?.team?.disablePrivateThreads) d8(`Private thread visibility is disabled for this workspace.
`);
      let s = await Lc0(t.settingsStorage, process.cwd(), c);
      if (s instanceof Error) d8(s.message);
    }
    let h = await UeT(t.settingsStorage, process.cwd(), r);
    if (h instanceof Error) d8(h.message);
    let i = h ?? "private";
    C9.write(`${i}
`), await t.asyncDispose(), process.exit(0);
  } catch (r) {
    await t.asyncDispose(), d8(`Error updating visibility defaults: ${r instanceof Error ? r.message : String(r)}
`);
  }
}