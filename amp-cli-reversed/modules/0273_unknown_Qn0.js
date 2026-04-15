function Qn0(T) {
  switch (T.type) {
    case "retry_scheduled":
      return {
        type: "retry_scheduled",
        message: T
      };
    case "retry_started":
      return {
        type: "retry_started",
        message: T
      };
    case "retry_cancelled":
      return {
        type: "retry_cancelled",
        message: T
      };
  }
}