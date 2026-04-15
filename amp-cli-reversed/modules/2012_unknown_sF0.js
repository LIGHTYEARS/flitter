async function sF0(T, R, a, e) {
  ua(e, T);
  let t = await X3(R, T);
  try {
    let r = await NA(a, t),
      h = JSON.stringify(r, null, 2);
    C9.write(h + `
`), await t.asyncDispose(), process.exit(0);
  } catch (r) {
    await t.asyncDispose();
    let h = `Failed to export thread: ${r instanceof Error ? r.message : String(r)}`;
    d8(h);
  }
}