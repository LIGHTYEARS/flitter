function MW(T, R, a) {
  if (T._state === "closed") return;
  if (T._state === "buffering") {
    T._queue = T._queue || [], T._queue.push({
      type: R,
      value: a
    });
    return;
  }
  if (T._state !== "ready") {
    T._state = "buffering", T._queue = [{
      type: R,
      value: a
    }], AL(() => dnR(T));
    return;
  }
  JdT(T, R, a);
}