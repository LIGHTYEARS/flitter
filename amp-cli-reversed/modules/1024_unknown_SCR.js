function jCR(T) {}
function SCR(T, R) {
  if (!R || !dCR(R)) return {
    ...T,
    output_parsed: null,
    output: T.output.map(a => {
      if (a.type === "function_call") return {
        ...a,
        parsed_arguments: null
      };
      if (a.type === "message") return {
        ...a,
        content: a.content.map(e => ({
          ...e,
          parsed: null
        }))
      };else return a;
    })
  };
  return eUT(T, R);
}