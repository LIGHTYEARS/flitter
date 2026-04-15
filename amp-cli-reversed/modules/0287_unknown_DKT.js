function DKT(T, R) {
  let a = process.env.AMP_DEBUG === "1" || process.argv.includes("--debug");
  J.error("CLI Error", T);
  let {
    message: e,
    suggestion: t
  } = $v(T);
  if (ul.write(oR.red.bold("Error: ") + e + `
`), t) {
    ul.write(`
`);
    let r = t.split(`
`);
    for (let h of r) ul.write(oR.blue(h) + `
`);
  }
  if (!(T instanceof GR) && e === V3.internalBug && (R !== void 0 || Il0(T))) {
    let r = R ? ` ${R}` : "";
    ul.write(`Use 'amp threads share${r} --support' to share this with the Amp team.
`);
  }
  if (a && T instanceof Error) if (ul.write(`
` + oR.grey("Debug details:") + `
`), T.stack) ul.write(T.stack + `
`);else ul.write(String(T) + `
`);
  return WP(), T instanceof GR ? T.exitCode : 1;
}