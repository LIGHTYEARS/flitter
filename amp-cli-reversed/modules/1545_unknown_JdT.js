function x2(T) {
  T._observer = void 0, T._queue = void 0, T._state = "closed";
}
function dnR(T) {
  let R = T._queue;
  if (!R) return;
  T._queue = void 0, T._state = "ready";
  for (let a of R) if (JdT(T, a.type, a.value), T._state === "closed") break;
}
function JdT(T, R, a) {
  T._state = "running";
  let e = T._observer;
  try {
    switch (R) {
      case "next":
        if (e && typeof e.next === "function") e.next(a);
        break;
      case "error":
        if (x2(T), e && typeof e.error === "function") e.error(a);else throw a;
        break;
      case "complete":
        if (x2(T), e && typeof e.complete === "function") e.complete();
        break;
    }
  } catch (t) {
    console.error("notifySubscription", t);
  }
  if (T._state === "closed") ZdT(T);else if (T._state === "running") T._state = "ready";
}