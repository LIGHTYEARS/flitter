function vP0(T, R) {
  switch (T) {
    case "removed":
      return `Removed ${R}`;
    case "updated":
      return `Updated ${R}`;
  }
}
function jP0(T) {
  return {
    onPathStart: ({
      action: R,
      path: a
    }) => {
      T.outputSurface.setTransientStatus($P0(R, a));
    },
    onPathComplete: ({
      outcome: R,
      path: a
    }) => {
      if (R === "unchanged") {
        T.outputSurface.clearTransientStatus();
        return;
      }
      T.lineWriter.writeStdoutLine(vP0(R, a));
    }
  };
}