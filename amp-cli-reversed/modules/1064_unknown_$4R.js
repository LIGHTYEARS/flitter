function g4R(T) {
  if (!T.goal || T.goal.trim().length === 0) throw Error("Handoff goal must be provided");
  if (!T.thread) throw Error("Handoff thread must be provided");
}
async function $4R(T) {
  g4R(T);
  let {
      thread: R,
      goal: a,
      images: e,
      deps: t
    } = T,
    r = await f4R(R, a, e, t.configService, t.signal, t.filesystem, t.deadline, t.serviceAuthToken);
  return {
    role: "user",
    messageId: 0,
    content: Array.isArray(r) ? r : [{
      type: "text",
      text: r
    }]
  };
}