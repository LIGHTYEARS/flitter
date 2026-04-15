function yz0(T, R) {
  switch (T) {
    case "update-available":
      return [new G("A newer Amp is available. Run ", new cT({
        color: R.foreground,
        dim: !0
      })), new G("amp update", new cT({
        color: R.warning
      }))];
    case "update-available-unrecognized-path":
      return [new G("A newer Amp is available.", new cT({
        color: R.foreground,
        dim: !0
      }))];
    case "update-available-brew":
      return [new G("A newer Amp is available. Run ", new cT({
        color: R.foreground,
        dim: !0
      })), new G("brew upgrade ampcode", new cT({
        color: R.warning
      }))];
    case "updated":
      return null;
    case "updated-with-warning":
      return [new G("Update complete, run ", new cT({
        color: R.foreground,
        dim: !0
      })), new G("amp update", new cT({
        color: R.warning
      })), new G(" to see warnings", new cT({
        color: R.foreground,
        dim: !0
      }))];
    case "update-error":
      return [new G("Update failed, run ", new cT({
        color: R.foreground,
        dim: !0
      })), new G("amp update", new cT({
        color: R.warning
      })), new G(" to see warnings", new cT({
        color: R.foreground,
        dim: !0
      }))];
    case "hidden":
      return null;
  }
}