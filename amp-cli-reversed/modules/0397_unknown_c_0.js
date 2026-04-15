async function c_0(T) {
  let R = a_0({
    input: R_0,
    output: Qi
  });
  return new Promise((a, e) => {
    R.on("SIGINT", () => {
      R.close(), e(Error("OAuth authorization cancelled"));
    }), R.question(T, t => {
      R.close(), a(t.trim());
    });
  });
}