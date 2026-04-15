async function rW0(T, R) {
  try {
    await PH0(T, R);
  } catch (a) {
    if (a instanceof Error && "code" in a && a.code === "EEXIST") return;
    throw a;
  }
}
async function hW0(T) {
  let R = AH0("sha256"),
    a = await yH0(T);
  return R.update(a), R.digest("hex");
}
class hhT {
  step = "discovery";
  requiresManualInstall = !1;
  products = [];
  error = "";
  downloadPath = "";
  getStep() {
    return this.step;
  }
  getError() {
    return this.error;
  }
  getProducts() {
    if (this.step === "discovery") throw Error("getProducts can only be called after discovery step is complete");
    return this.products;
  }
  isRequiresManualInstall() {
    return this.requiresManualInstall;
  }
  getDownloadPath() {
    if (["discovery", "selection", "downloading"].includes(this.step)) throw Error("getDownloadPath can only be called after downloading step is complete");
    return this.downloadPath;
  }
  transitionToError(T) {
    return this.step = "error", this.error = T, this;
  }
  transitionToSelection(T, R) {
    if (this.step !== "discovery") return this;
    return this.requiresManualInstall = T, this.products = R, this.step = "selection", this;
  }
  transitionToDownload(T) {
    if (this.step !== "selection") return this;
    return this.requiresManualInstall = T, this.step = "downloading", this;
  }
  transitionToInstall(T) {
    if (this.step !== "downloading") return this;
    if (this.requiresManualInstall) this.step = "manual-installation";else this.step = "installing";
    return this.downloadPath = T, this;
  }
  transitionToSuccess() {
    if (this.step !== "installing") return this;
    return this.step = "success", this;
  }
  clone() {
    let T = new hhT();
    return T.step = this.step, T.requiresManualInstall = this.requiresManualInstall, T.products = [...this.products], T.error = this.error, T.downloadPath = this.downloadPath, T;
  }
}