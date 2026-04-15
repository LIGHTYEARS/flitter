function WW(T) {
  return d0(zR.file(T));
}
async function qAR(T, R, a) {
  if (R === null || a === null) return;
  let e;
  try {
    e = await lN.promises.readFile(T);
  } catch (l) {
    J.debug("Failed to read Zed buffer content", {
      bufferPath: T,
      error: l instanceof Error ? l.message : String(l)
    });
    return;
  }
  let t = ziT(R, e.length),
    r = ziT(a, e.length),
    h = Math.min(t, r),
    i = Math.max(t, r),
    c = FiT(e, h),
    s = FiT(e, i),
    A = h === i ? zAR(e, h) : e.slice(h, i).toString("utf-8");
  return {
    range: {
      startLine: c.line,
      startCharacter: c.character,
      endLine: s.line,
      endCharacter: s.character
    },
    content: A
  };
}