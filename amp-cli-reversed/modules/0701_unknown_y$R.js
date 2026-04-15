function JBT(T, R) {
  let a;
  if (T.isVertexAI()) a = R ? "publishers/google/models" : "models";else a = R ? "models" : "tunedModels";
  return a;
}
function T6T(T) {
  for (let R of ["models", "tunedModels", "publisherModels"]) if (u$R(T, R)) return T[R];
  return [];
}
function u$R(T, R) {
  return T !== null && typeof T === "object" && R in T;
}
function y$R(T, R = {}) {
  let a = T,
    e = {
      name: a.name,
      description: a.description,
      parametersJsonSchema: a.inputSchema
    };
  if (a.outputSchema) e.responseJsonSchema = a.outputSchema;
  if (R.behavior) e.behavior = R.behavior;
  return {
    functionDeclarations: [e]
  };
}