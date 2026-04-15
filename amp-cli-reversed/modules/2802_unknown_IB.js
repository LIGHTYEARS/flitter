function IB(T) {
  let R = ehT(),
    a;
  switch (R) {
    case "darwin":
      a = kA.join(fgT(), "Library", "Application Support", T);
      break;
    case "win32":
      {
        let e = process.env.APPDATA || kA.join(fgT(), "AppData", "Roaming");
        a = kA.join(e, T);
        break;
      }
    default:
      throw Error(`Unsupported operating system: ${R}`);
  }
  return a;
}