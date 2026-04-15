function FDR(T) {
  let R = $k(T, (a => {
    let e = `${T.model.includes("/") ? T.model.split("/")[0] : "anthropic"}/${a.replace(/^[^/]+\//, "")}`;
    return Ys(e);
  })(T.model));
  return {
    ...R,
    content: R.content.map(a => {
      if (a.type === "tool_use") return {
        ...a,
        id: zDR(a.id)
      };
      return a;
    })
  };
}