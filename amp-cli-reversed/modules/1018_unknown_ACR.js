function ACR(T, R) {
  let a = T.tools?.find(e => P7(e) && e.function?.name === R.function.name);
  return {
    ...R,
    function: {
      ...R.function,
      parsed_arguments: jO(a) ? a.$parseRaw(R.function.arguments) : a?.function.strict ? JSON.parse(R.function.arguments) : null
    }
  };
}