function XP0(T) {
  return new Promise(R => {
    setTimeout(R, T);
  });
}
async function YP0(T) {
  let R = await Tk0({
    threadId: T.threadId,
    threadService: T.threadService
  });
  T.transport.requestExecutorSpawn(void 0, R);
}
async function QP0(T) {
  try {
    let R = await kH(T.threadId, T.threadService),
      a = R.title?.trim();
    return {
      title: a && a.length > 0 ? a : null,
      archived: R.archived === !0
    };
  } catch {
    return {
      title: null,
      archived: null
    };
  }
}