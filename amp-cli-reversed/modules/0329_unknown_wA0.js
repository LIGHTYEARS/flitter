function RtT(T) {
  return T.map(R => DA0(R.spec));
}
function wA0(T, R) {
  let a = wkT(T),
    e = wkT(R);
  return {
    toolsToRegister: R.filter(t => {
      let r = a.get(t.name),
        h = e.get(t.name);
      return r?.serializedSchema !== h?.serializedSchema;
    }),
    toolNamesToUnregister: [...a.keys()].filter(t => !e.has(t))
  };
}