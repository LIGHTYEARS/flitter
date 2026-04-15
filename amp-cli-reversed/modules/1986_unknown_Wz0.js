async function h$T(T) {
  if (!C9.write(T)) await qUR(C9, "drain");
}
function Wz0(T, R) {
  let a = R.args[0],
    e = R.commands.map(t => t.name());
  if (a && !a.includes(" ") && a.length < 30 && !/[./\\]/.test(a)) {
    let t = e.filter(h => a.includes(h) || h.includes(a)),
      r = "Run amp --help for a list of available commands.";
    if (t.length > 0) r = `Did you mean: ${t.join(", ")}? Or run amp --help for all commands.`;
    throw new GR(V3.unknownCommand(a), 1, r);
  }
}