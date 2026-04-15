async function rzR(T, R, a) {
  let e = await R.getAllRecords(),
    t = I7T(e, h => !h.reverted),
    r = Array.from(t.entries());
  await g7T(r, tzR, async ([h, i]) => {
    try {
      await T.stat(h);
    } catch (c) {
      if (!Er(c)) throw c;
      if (i.after === "") return;
      await R.record({
        toolUse: a,
        uri: h,
        before: i.after,
        after: null
      });
    }
  });
}