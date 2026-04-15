function OnR(T) {
  let R = T.settings["tools.stopTimeout"],
    a = u0T("amp.tools.stopTimeout");
  return (R ?? a) * 1000;
}
function k2(T) {
  let R = T.settings["network.timeout"],
    a = u0T("amp.network.timeout");
  return (R ?? a) * 1000;
}
function AL(T) {
  Promise.resolve().then(() => {
    try {
      T();
    } catch (R) {
      console.error(R);
    }
  });
}
function ZdT(T) {
  let R = T._cleanup;
  if (R === void 0) return;
  if (T._cleanup = void 0, !R) return;
  try {
    if (typeof R === "function") R();else if (R && typeof R.unsubscribe === "function") R.unsubscribe();
  } catch (a) {
    console.error("cleanupSubscription", a);
  }
}