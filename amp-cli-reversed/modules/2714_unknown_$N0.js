function gN0(T) {
  return T.replaceAll("'", "''");
}
async function $N0(T) {
  let R = `Remove-Item -LiteralPath '${gN0(T)}' -Force -ErrorAction SilentlyContinue`;
  try {
    await Qm("powershell.exe", ["-NoProfile", "-Command", R], {
      timeout: 3000
    });
  } catch {}
}