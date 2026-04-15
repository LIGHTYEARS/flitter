function k$R(T) {
  if (typeof T !== "string") return T;
  let R = T;
  if (R.startsWith("gs://")) return {
    format: "jsonl",
    gcsUri: R
  };else if (R.startsWith("bq://")) return {
    format: "bigquery",
    bigqueryUri: R
  };else throw Error(`Unsupported destination: ${R}`);
}