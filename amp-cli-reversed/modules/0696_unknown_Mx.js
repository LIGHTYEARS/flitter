function q8T(T) {
  if ("multiSpeakerVoiceConfig" in T) throw Error("multiSpeakerVoiceConfig is not supported in the live API.");
  return T;
}
function Mx(T) {
  if (T.functionDeclarations) for (let R of T.functionDeclarations) {
    if (R.parameters) {
      if (!Object.keys(R.parameters).includes("$schema")) R.parameters = LP(R.parameters);else if (!R.parametersJsonSchema) R.parametersJsonSchema = R.parameters, delete R.parameters;
    }
    if (R.response) {
      if (!Object.keys(R.response).includes("$schema")) R.response = LP(R.response);else if (!R.responseJsonSchema) R.responseJsonSchema = R.response, delete R.response;
    }
  }
  return T;
}