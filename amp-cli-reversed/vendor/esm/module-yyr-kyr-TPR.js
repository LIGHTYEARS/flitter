// Module: module-yyr-kyr-TPR
// Original: TPR
// Type: ESM (PT wrapper)
// Exports: RDT, aDT
// Category: util

// Module: TPR (ESM)
() => {
  (YyR(),
    (RDT = c0(KyR(), 1)),
    (aDT =
      dN.platform === "win32"
        ? [
            "APPDATA",
            "HOMEDRIVE",
            "HOMEPATH",
            "LOCALAPPDATA",
            "PATH",
            "PROCESSOR_ARCHITECTURE",
            "SYSTEMDRIVE",
            "SYSTEMROOT",
            "TEMP",
            "USERNAME",
            "USERPROFILE",
            "PROGRAMFILES",
          ]
        : ["HOME", "LOGNAME", "PATH", "SHELL", "TERM", "USER"]));
};
