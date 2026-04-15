function WG0() {
  let T = process.env.SHELL;
  if (T && Av(T)) return T;
  if (Av("C:\\Program Files\\PowerShell\\7\\pwsh.exe")) return "C:\\Program Files\\PowerShell\\7\\pwsh.exe";
  return "powershell.exe";
}