async function VTR() {
  let T = GTR();
  if (T === "darwin") return jN0();
  if (T === "win32") return dN0();
  let R = process.env.WAYLAND_DISPLAY && (await LQ("wl-paste")),
    a = process.env.DISPLAY && (await LQ("xclip"));
  if (R) {
    let e = await SN0();
    if (e !== null) return e;
  }
  if (a) {
    let e = await ON0();
    if (e !== null) return e;
  }
  if (xN0()) {
    let e = await EN0();
    if (e !== null) return e;
  }
  return J.info("No clipboard tools available for image pasting"), null;
}