function sFT(T) {
  return T.map(k3T);
}
async function FI(T, R) {
  return (await T.client.responses.inputTokens.count({
    model: T.model,
    input: R.input,
    ...(R.tools.length > 0 ? {
      tools: R.tools
    } : {})
  })).input_tokens;
}