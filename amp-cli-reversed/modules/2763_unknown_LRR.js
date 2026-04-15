function LRR(T) {
  if (T instanceof Tc) return {
    title: "Info",
    description: T.message,
    type: "info"
  };
  return J.warn("Unknown error type encountered", {
    name: T.name,
    message: T.message,
    stack: T.stack
  }), {
    title: "Error",
    description: T.message || "An unexpected error occurred.",
    type: "error"
  };
}