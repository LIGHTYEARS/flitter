function wx(T, R) {
  let a = R;
  if (!T.isVertexAI()) if (/batches\/[^/]+$/.test(a)) return a.split("/").pop();else throw Error(`Invalid batch job name: ${a}.`);
  if (/^projects\/[^/]+\/locations\/[^/]+\/batchPredictionJobs\/[^/]+$/.test(a)) return a.split("/").pop();else if (/^\d+$/.test(a)) return a;else throw Error(`Invalid batch job name: ${a}.`);
}