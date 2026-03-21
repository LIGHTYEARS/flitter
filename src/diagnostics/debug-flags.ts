// Debug flags — Global debug flags that can be toggled at runtime
// Amp ref: Various debug flags found in amp-strings.txt

/**
 * Global debug flags for controlling diagnostic output.
 * All flags default to false. Toggle at runtime via setDebugFlag().
 */
export const debugFlags = {
  /** Show layout bounds (paint a border around every RenderBox) */
  debugPaintSize: false,
  /** Log every Widget.build() call */
  debugPrintBuilds: false,
  /** Log every performLayout() call */
  debugPrintLayouts: false,
  /** Log every paint() call */
  debugPrintPaints: false,
  /** Cycle border colors on repaint to visualize repaint regions */
  debugRepaintRainbow: false,
  /** Show frame timing in console */
  debugShowFrameStats: false,
};

/**
 * Set a specific debug flag to the given value.
 */
export function setDebugFlag(
  flag: keyof typeof debugFlags,
  value: boolean,
): void {
  debugFlags[flag] = value;
}

/**
 * Reset all debug flags to false.
 */
export function resetDebugFlags(): void {
  for (const key of Object.keys(debugFlags) as Array<keyof typeof debugFlags>) {
    debugFlags[key] = false;
  }
}
