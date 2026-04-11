// Module: module-s0-rr-LAR
// Original: LAR
// Type: ESM (PT wrapper)
// Exports: HiT, NiT, PCT, UiT, WiT, kCT, mCT, uCT, xCT, yCT
// Category: util

// Module: LAR (ESM)
() => {
  (s0(),
    rR(),
    gx(),
    (mCT =
      /^L(?<line>\d+)(?:(?<columnSeparator>:|C)(?<column>\d+))?(?:-L(?<endLine>\d+)(?:(?<endColumnSeparator>:|C)(?<endColumn>\d+))?)?$/),
    (NiT = {
      ideName: "VS Code",
      userDataEnv: "VSCODE_USER_DATA_DIR",
      userDataDirName: "Code",
      urlScheme: "vscode",
      appPathMarkers: ["visual studio code.app"],
      executableNames: ["code", "code.exe"],
      commandCandidates: {
        unix: ["code"],
        windows: ["code.cmd", "code.exe", "code"],
      },
    }),
    (UiT = {
      ideName: "VS Code Insiders",
      userDataEnv: "VSCODE_INSIDERS_USER_DATA_DIR",
      userDataDirName: "Code - Insiders",
      urlScheme: "vscode-insiders",
      appPathMarkers: ["visual studio code - insiders.app"],
      executableNames: ["code-insiders", "code-insiders.exe"],
      commandCandidates: {
        unix: ["code-insiders"],
        windows: ["code-insiders.cmd", "code-insiders.exe", "code-insiders"],
      },
    }),
    (HiT = {
      ideName: "Cursor",
      userDataEnv: "CURSOR_USER_DATA_DIR",
      userDataDirName: "Cursor",
      urlScheme: "cursor",
      appPathMarkers: ["cursor.app"],
      executableNames: ["cursor", "cursor.exe"],
      commandCandidates: {
        unix: ["cursor"],
        windows: ["cursor.cmd", "cursor.exe", "cursor"],
      },
    }),
    (WiT = {
      ideName: "Windsurf",
      userDataEnv: "WINDSURF_USER_DATA_DIR",
      userDataDirName: "Windsurf",
      urlScheme: "windsurf",
      appPathMarkers: ["windsurf.app"],
      executableNames: ["windsurf", "windsurf.exe"],
      commandCandidates: {
        unix: ["windsurf"],
        windows: ["windsurf.cmd", "windsurf.exe", "windsurf"],
      },
    }),
    (uCT = iAR(hAR)),
    (yCT = yE(NiT)),
    (PCT = yE(UiT)),
    (kCT = yE(HiT)),
    (xCT = yE(WiT)));
};
