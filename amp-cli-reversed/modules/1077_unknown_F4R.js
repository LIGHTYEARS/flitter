function F4R(T) {
  let R = ["image exceeds", "MB maximum"],
    a = R.every(t => T.message?.includes(t)),
    e = Boolean(T.error?.type === "invalid_request_error" && T.error?.message && R.every(t => T.error?.message?.includes(t)));
  return a || e;
}