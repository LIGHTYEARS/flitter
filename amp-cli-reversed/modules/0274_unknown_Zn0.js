function Zn0(T) {
  switch (T.type) {
    case "error_set":
      return {
        type: "active_error_set",
        message: T
      };
    case "error_cleared":
      return {
        type: "active_error_cleared",
        message: T
      };
  }
}