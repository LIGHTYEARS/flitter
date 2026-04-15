function fzT() {
  try {
    let T = qzR.userInfo().shell;
    if (!T || T === "unknown") return;
    return T;
  } catch (T) {
    if (T?.code === "ENOENT") J.warn("os.userInfo() failed \u2013 user probably provided by NSS/FreeIPA");else J.warn("os.userInfo() failed", {
      err: T
    });
    return;
  }
}