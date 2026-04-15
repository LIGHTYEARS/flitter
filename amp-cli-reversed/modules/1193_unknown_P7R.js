function P7R(T, R) {
  if (!T) return {
    action: null
  };
  try {
    return T(R.thread);
  } catch (a) {
    return J.error("Error processing assistant end-turn hook", a), {
      action: null
    };
  }
}