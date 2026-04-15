function dfR(T) {
  if (!T || typeof T !== "string") return T;
  let R = T.replace(kwT, "");
  if (R.length !== T.length) {
    let a = T.length - R.length;
    J.info("Invisible Unicode tag characters removed during sanitization", {
      removedCount: a
    });
  }
  return R;
}