function MU0(T, R) {
  if (Ob(T)) return `amp dtw-curl ${R}`;
  return `AMP_URL=${JSON.stringify(T)} pnpm -C cli cli -- dtw-curl ${R}`;
}
function wRR(T, R) {
  let a = MU0(R, T);
  return [{
    label: "dtw: get full transcript",
    command: `${a} get-transcript`
  }, {
    label: "dtw: send message via curl",
    command: `${a} add-message "<your message here>"`
  }, {
    label: "dtw: dump full sqlite DB to disk",
    command: `${a} dump`
  }, {
    label: "dtw: fetch Cloudflare logs",
    command: `./scripts/fetch-cloudflare-logs.ts ${T}`
  }];
}