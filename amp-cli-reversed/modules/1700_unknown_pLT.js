async function pLT(T, R) {
  let a = await fi("/api/telemetry", {
    method: "POST",
    redirect: "manual",
    body: T
  }, R);
  if (!a.ok) {
    let e = await a.text(),
      t;
    try {
      t = JSON.parse(e).error || `HTTP ${a.status}`;
    } catch {
      t = e || `HTTP ${a.status}`;
    }
    throw Error(`Failed to submit telemetry: ${t}`);
  }
}