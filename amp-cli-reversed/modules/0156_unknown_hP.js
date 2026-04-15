function hP() {
  let T = L0[CR++] & 31;
  if (T > 23) switch (T) {
    case 24:
      T = L0[CR++];
      break;
    case 25:
      T = St.getUint16(CR), CR += 2;
      break;
    case 26:
      T = St.getUint32(CR), CR += 4;
      break;
  }
  return T;
}