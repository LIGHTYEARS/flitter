function kER(T) {
  switch (T) {
    case "minimal":
      return "MINIMAL";
    case "low":
      return K$.LOW;
    case "medium":
      return "MEDIUM";
    case "high":
      return K$.HIGH;
    default:
      return K$.THINKING_LEVEL_UNSPECIFIED;
  }
}