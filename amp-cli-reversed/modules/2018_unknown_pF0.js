async function pF0(T, R, a, e, t) {
  ua(e, T);
  let r = await X3(R, T);
  try {
    await NA(a, r), await r.asyncDispose(), await SB(R, {
      ...T,
      threadId: a,
      nonBlockingThreadOwnershipCheck: !0
    }, e, t);
  } catch (h) {
    await r.asyncDispose(), await Jl(h, a);
  }
}