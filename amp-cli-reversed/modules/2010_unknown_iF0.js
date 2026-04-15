async function iF0(T, R, a) {
  let e = await X3(R, T);
  try {
    await e.threadService.delete(a), C9.write(oR.green(`\u2713 Thread ${a} deleted
`)), await e.asyncDispose(), process.exit(0);
  } catch (t) {
    await e.asyncDispose(), d8(`Failed to delete thread: ${t instanceof Error ? t.message : String(t)}`);
  }
}