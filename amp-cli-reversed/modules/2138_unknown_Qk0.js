function Qk0({
  command: T,
  commandPath: R,
  rootCommand: a
}) {
  let e = "";
  if (T === a) e += oR.bold("Amp CLI") + `

`;
  if (e += oR.bold("Usage:") + " " + oR.green(Zk0(R, T)) + `

`, T !== a && T.description) e += T.description + `

`;
  let t = T.subcommands;
  if (t !== void 0 && t.length > 0) e += oR.bold("Commands:") + `

`, e += Tx0(t), e += `
`;
  if (e += RfT(T.options, "Options:"), T !== a) {
    let r = new Set(T.options.map(i => i.long)),
      h = a.options.filter(i => !r.has(i.long));
    e += RfT(h, "Global options:");
  }
  return e;
}