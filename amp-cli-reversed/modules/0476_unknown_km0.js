function km0(T) {
  let R = (T & 4) !== 0,
    a = (T & 8) !== 0,
    e = (T & 16) !== 0,
    t = (T & 32) !== 0,
    r = T & -61,
    h = "unknown";
  switch (r) {
    case 0:
      h = "left";
      break;
    case 1:
      h = "middle";
      break;
    case 2:
      h = "right";
      break;
    case 64:
      h = "wheel_up";
      break;
    case 65:
      h = "wheel_down";
      break;
    case 66:
      h = "wheel_left";
      break;
    case 67:
      h = "wheel_right";
      break;
    default:
      h = "unknown";
      break;
  }
  return {
    button: h,
    modifiers: {
      shift: R,
      ctrl: e,
      alt: a,
      meta: !1
    },
    motion: t
  };
}