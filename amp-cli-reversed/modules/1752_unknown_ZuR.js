function ZuR(T, R, a) {
  if (!T) throw Error(`${a} does not support task creation (required for ${R})`);
  switch (R) {
    case "tools/call":
      if (!T.tools?.call) throw Error(`${a} does not support task creation for tools/call (required for ${R})`);
      break;
    default:
      break;
  }
}