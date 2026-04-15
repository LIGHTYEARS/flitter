function UXR(T = "idle") {
  try {
    if (T === "idle") uz("afplay /System/Library/Sounds/Submarine.aiff");else if (T === "idle-review") uz("afplay /System/Library/Sounds/Glass.aiff");else if (T === "requires-user-input") uz("afplay /System/Library/Sounds/Ping.aiff");
  } catch (R) {
    J.error(`Failed to play notification sound (${T}):`, R);
  }
}