function Rk0() {
  throw new GR("Interactive checkout prompt is not available in this context.", 1);
}
function ak0() {
  let T = null,
    R = () => {
      T?.();
    },
    a = new Promise(e => {
      T = e;
    });
  return Ne.once("SIGINT", R), Ne.once("SIGTERM", R), {
    promise: a,
    dispose: () => {
      Ne.removeListener("SIGINT", R), Ne.removeListener("SIGTERM", R);
    }
  };
}