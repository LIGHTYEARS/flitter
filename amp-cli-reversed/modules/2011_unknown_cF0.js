async function cF0(T, R, a, e) {
  ua(e, T);
  let t = await X3(R, T);
  try {
    let r = await NA(a, t),
      h = KN(r);
    C9.write(h + `
`), await t.asyncDispose(), process.exit(0);
  } catch (r) {
    await t.asyncDispose();
    let h = `Failed to render thread as markdown: ${r instanceof Error ? r.message : String(r)}`;
    d8(h);
  }
}