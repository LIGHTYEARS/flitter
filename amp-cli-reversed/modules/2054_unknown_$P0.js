function $P0(T, R) {
  switch (T) {
    case "syncing":
      return `Syncing... ${R}`;
    case "removing":
      return `Removing... ${R}`;
    case "updating":
      return `Updating... ${R}`;
  }
}