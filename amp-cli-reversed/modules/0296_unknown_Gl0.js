function Gl0(T) {
  if (!HKT(T)) return 1;
  switch (T.role) {
    case "user":
      return ql0(T.content) ? 0 : 2;
    case "assistant":
      return T.state.type !== "streaming" ? 0 : 2;
    default:
      return 1;
  }
}