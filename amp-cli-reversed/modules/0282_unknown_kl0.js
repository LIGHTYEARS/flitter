function LKT(T) {
  let R = z9.safeParse(T.dtwMessageID);
  if (R.success) return R.data;
  let a = z9.safeParse(`${T.messageId}`);
  return a.success ? a.data : null;
}
function yl0(T) {
  return T.map((R, a) => ({
    ...R,
    messageId: a
  }));
}
function MKT(T) {
  let R = new Set();
  for (let a of T) {
    let e = LKT(a);
    if (e) R.add(e);
  }
  return R;
}
function J1(T, R) {
  for (let [a, e] of T.entries()) if (LKT(e) === R) return a;
  return -1;
}
function kl0(T, R, a) {
  let e = !1,
    t = null,
    r = () => {
      if (e) return;
      if (e = !0, t) clearTimeout(t), t = null;
      T.setObserverCallbacks(null);
    };
  return {
    promise: new Promise((h, i) => {
      let c = {
        onMessageEvent: s => {
          if (s.message.messageId === R) r(), h(s);
        },
        onError: s => {
          r(), i(Error(s.message));
        },
        onExecutorError: s => {
          r(), i(Error(s.message));
        },
        onConnectionChange: s => {
          if (s.state === "disconnected") r(), i(Error("Disconnected before message was acknowledged"));
        }
      };
      T.setObserverCallbacks(c), t = setTimeout(() => {
        r(), i(Error(`Timed out waiting for message_added after ${a}ms`));
      }, a);
    }),
    dispose: r
  };
}