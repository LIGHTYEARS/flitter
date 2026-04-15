function dL0(T, R, a) {
  T.command("usage <threadIDOrURL>").summary("Show usage information for a thread").description("Show display cost information for a thread. Accepts either a thread ID or thread URL.").action(async (e, t, r) => {
    let h = mr(e);
    if (!h) Zi(e);
    let i = r.optsWithGlobals(),
      c = await R(i);
    await OL0(i, c, h, r, a);
  });
}