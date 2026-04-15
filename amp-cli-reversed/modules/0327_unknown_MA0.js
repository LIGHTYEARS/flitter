function wkT(T) {
  let R = new Map();
  for (let a of T) R.set(a.name, {
    schema: a,
    serializedSchema: JSON.stringify(a)
  });
  return R;
}
function MA0(T) {
  let R = {
    ...(T.executionProfile?.serial !== void 0 ? {
      serial: T.executionProfile.serial
    } : {}),
    ...(T.meta?.deferred !== void 0 ? {
      deferred: T.meta.deferred
    } : {}),
    ...(T.meta?.skillNames !== void 0 ? {
      skillNames: [...T.meta.skillNames]
    } : {})
  };
  return Object.keys(R).length > 0 ? R : void 0;
}