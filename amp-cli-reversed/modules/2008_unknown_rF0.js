async function rF0(T, R, a, e, t) {
  ua(t, T);
  let r = await X3(R, T);
  try {
    let h = e.trim();
    if (h.length === 0) d8("Thread name cannot be empty");
    if (h.length > 256) d8("Thread name cannot exceed 256 characters");
    if (!(await NA(a, r)).messages.length) d8("Cannot rename an empty thread.");
    let i = await yhT(r),
      c = await ct.getOrCreateForThread(i, a);
    await c.handle({
      type: "title",
      value: h
    }), await r.threadService.flushVersion(a, c.thread.v), C9.write(oR.green(`\u2713 Thread ${a} renamed to "${h}"
`)), await r.asyncDispose(), process.exit(0);
  } catch (h) {
    await r.asyncDispose();
    let i = `Failed to rename thread: ${h instanceof Error ? h.message : String(h)}`;
    d8(i);
  }
}