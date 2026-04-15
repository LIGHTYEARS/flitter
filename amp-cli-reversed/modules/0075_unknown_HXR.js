function HXR() {
  try {
    let T = NXR(process.cwd()) || process.cwd();
    BXR("say", [`Amp is done in ${T}`]);
  } catch (T) {
    J.error("Failed to play voice completion notification:", T);
  }
}