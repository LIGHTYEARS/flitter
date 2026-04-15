function OY(T) {
  return {
    syncOutput: !1,
    emojiWidth: !1,
    pixelMouse: !1,
    pixelDimensions: !1,
    xtversion: null,
    canRgb: !0,
    supportsCursorShape: !0,
    animationSupport: "fast",
    kittyKeyboard: !1,
    osc52: !1,
    kittyGraphics: !1,
    background: "unknown",
    colorPaletteNotifications: !1,
    kittyExplicitWidth: !1,
    underlineSupport: ji() ? "none" : "standard",
    scrollStep: () => 3,
    ...T
  };
}