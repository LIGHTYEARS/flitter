async function IyR(T, R, a = fetch) {
  let e = await vyR(T, "oauth-protected-resource", a, {
    protocolVersion: R?.protocolVersion,
    metadataUrl: R?.resourceMetadataUrl
  });
  if (!e || e.status === 404) throw await e?.body?.cancel(), Error("Resource server does not implement OAuth 2.0 Protected Resource Metadata.");
  if (!e.ok) throw await e.body?.cancel(), Error(`HTTP ${e.status} trying to load well-known OAuth protected resource metadata.`);
  return qMT.parse(await e.json());
}