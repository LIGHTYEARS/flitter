async function r40(T, R, a) {
  let e = R ? `Input received on stdin:
\`\`\`
${R}
\`\`\`

${T}` : T,
    t = (await Hs()).trees?.[0]?.repository?.url;
  if (!t) throw new GR("Unable to detect Git repository URL in current directory");
  let r = await N3.createRemoteExecutorThread({
    prompt: e,
    repositoryURL: t
  }, {
    config: a
  });
  if (!r.ok) throw new GR(r.error.message ?? r.error.code);
  process.stdout.write(`${r.result.url}
`);
}