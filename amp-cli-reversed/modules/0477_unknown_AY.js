function AY(T, R, a, e) {
  let t = km0(T.button),
    r;
  if (t.button === "wheel_up" || t.button === "wheel_down" || t.button === "wheel_left" || t.button === "wheel_right") r = "scroll";else if (t.motion) r = "move";else if (T.pressed) r = "press";else r = "release";
  let h, i;
  if (R && a && e) h = (T.x - 1) / a, i = (T.y - 1) / e;else h = T.x - 1, i = T.y - 1;
  return {
    type: "mouse",
    action: r,
    button: t.button,
    x: h,
    y: i,
    modifiers: t.modifiers,
    drag: t.motion && T.pressed
  };
}