function WpR({
  exitCode: T,
  stderr: R
}, a) {
  switch (T) {
    case 0:
      return {
        action: "allow",
        matchedEntry: a
      };
    case 1:
      return {
        action: "ask",
        matchedEntry: a
      };
    default:
      return {
        action: "reject",
        matchedEntry: a,
        error: R
      };
  }
}