function AxR(T, R) {
  let a = ["---"];
  if (T.title) a.push(`title: ${T.title}`);
  if (R) a.push(`author: ${R}`);
  if (a.push(`threadId: ${T.id}`), a.push(`created: ${new Date(T.created).toISOString()}`), T.agentMode) a.push(`agentMode: ${T.agentMode}`);
  return a.push("---"), a.join(`
`);
}