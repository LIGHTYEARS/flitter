function sHR() {
  switch (QUR.platform()) {
    case "darwin":
      return "/Library/Application Support/ampcode/managed-settings.json";
    case "linux":
      return "/etc/ampcode/managed-settings.json";
    case "win32":
      return "C:\\ProgramData\\ampcode\\managed-settings.json";
    default:
      return null;
  }
}