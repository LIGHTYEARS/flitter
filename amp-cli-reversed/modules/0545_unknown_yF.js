function yF(T, R, a) {
  let e;
  switch (T.button) {
    case "wheel_up":
      e = "up";
      break;
    case "wheel_down":
      e = "down";
      break;
    case "wheel_left":
      e = "left";
      break;
    case "wheel_right":
      e = "right";
      break;
    default:
      e = "down";
  }
  return {
    type: "scroll",
    direction: e,
    ...Ol(T, R, a)
  };
}