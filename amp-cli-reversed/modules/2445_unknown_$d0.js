function $d0(T, R) {
  switch (T) {
    case "error":
      return {
        color: R.toolError,
        icon: "\u2715"
      };
    case "warning":
      return {
        color: R.recommendation,
        icon: ""
      };
    case "success":
    default:
      return {
        color: R.toolSuccess,
        icon: "\u2713"
      };
  }
}