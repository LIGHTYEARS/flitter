function N5R(T) {
  switch (T.toLowerCase()) {
    case "error":
      return "error";
    case "warning":
      return "warning";
    case "information":
    case "info":
      return "info";
    case "hint":
      return "hint";
    default:
      return "info";
  }
}