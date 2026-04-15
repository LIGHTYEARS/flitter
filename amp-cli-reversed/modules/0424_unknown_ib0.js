function ib0() {
  let T = "";
  T += oR.bold("Environment variables:") + `

`;
  let R = [["AMP_API_KEY", "Access token for Amp (see https://ampcode.com/settings)"], ["AMP_URL", `URL for the Amp service (default is ${Lr})`], ["AMP_LOG_LEVEL", "Set log level (can also use --log-level)"], ["AMP_LOG_FILE", "Set log file location (can also use --log-file)"], ["AMP_SETTINGS_FILE", `Set settings file path (can also use --settings-file, default: ${dA})`]];
  T += ltT(R), T += `
`, T += oR.bold("Examples:") + `

`;
  for (let e of L4.examples) if (T += e.description + `

`, T += `  $ ${oR.green(e.command)}
`, e.output) {
    let t = e.output.split(`
`).filter(r => r.trim() !== "");
    T += t.map(r => "  " + oR.dim(r)).join(`
`), T += `

`;
  } else T += `
`;
  T += oR.bold("Configuration:") + `

`, T += L4.configuration.description + `

`, T += oR.bold("Settings reference:") + `

`;
  let a = L4.configuration.keyDescriptions.map(e => [e.key, e.description]);
  return T += AtT(a), T += `
`, T += oR.bold("Example configuration:") + `

`, T += L4.configuration.sampleConfig + `

`, T;
}