function dVR(T) {
  return T["internal.oracleReasoningEffort"] ?? "high";
}
function EVR(T, R) {
  let a = T.task;
  if (T.context) a = `Context: ${T.context}

Task: ${T.task}`;
  if (R) a += `

Relevant files:

${R}`;
  if (T.parentThreadID) a += `

Parent thread: ${T.parentThreadID}
You can use the read_thread tool with this ID to read the full conversation that invoked you if you need more context.`;
  return a;
}