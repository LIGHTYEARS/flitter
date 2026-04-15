function Q1(T) {
  return {
    kind: jKT,
    failureType: T.failureType ?? null,
    source: T.source ?? null,
    direction: T.direction ?? null,
    stage: T.stage ?? null,
    summary: T.summary ?? null,
    messageType: T.messageType ?? null,
    typePreview: T.typePreview ?? null,
    payloadPreview: T.payloadPreview ?? null,
    issues: T.issues ?? []
  };
}