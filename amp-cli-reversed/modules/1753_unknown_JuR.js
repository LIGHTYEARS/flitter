function JuR(T, R, a) {
  if (!T) throw Error(`${a} does not support task creation (required for ${R})`);
  switch (R) {
    case "sampling/createMessage":
      if (!T.sampling?.createMessage) throw Error(`${a} does not support task creation for sampling/createMessage (required for ${R})`);
      break;
    case "elicitation/create":
      if (!T.elicitation?.create) throw Error(`${a} does not support task creation for elicitation/create (required for ${R})`);
      break;
    default:
      break;
  }
}