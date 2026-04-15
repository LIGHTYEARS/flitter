function Ol(T, R, a) {
  return {
    position: R,
    localPosition: a,
    modifiers: {
      shift: T.modifiers.shift,
      ctrl: T.modifiers.ctrl,
      alt: T.modifiers.alt,
      meta: T.modifiers.meta
    },
    timestamp: Date.now()
  };
}