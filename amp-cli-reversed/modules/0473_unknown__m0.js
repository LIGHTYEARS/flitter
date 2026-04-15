function _m0(T) {
  let R = new eS().name("install").description("Install required tools like ripgrep to $AMP_HOME/bin").option("--force", "Force reinstallation even if already installed").option("--verbose", "Show installation progress and results").action(async e => {
    await gb0(e.force || !1, e.verbose || !1, "0.0.1775894934-g5bb49b"), process.exit();
  });
  T.addCommand(R, {
    hidden: !0
  });
  let a = new eS("update").alias("up").summary("Update Amp CLI").description("Update Amp CLI to the latest version. You can specify a particular version to install, or leave blank to get the latest stable release.").option("--target-version <version>", "Update to a specific version").allowUnknownOption(!1).action(async e => {
    await mm0(e.targetVersion);
  });
  T.addCommand(a);
}