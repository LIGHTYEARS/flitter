async function hF0(T, R, a, e) {
  let t = await X3(R, T);
  try {
    await t.threadService.archive(a, e), await dS(t.threadService, a), C9.write(oR.green(`\u2713 Thread ${e ? "archived" : "unarchived"} successfully
`)), await t.asyncDispose(), process.exit(0);
  } catch (r) {
    await t.asyncDispose(), d8(`Failed to ${e ? "archive" : "unarchive"} thread: ${r instanceof Error ? r.message : String(r)}`);
  }
}