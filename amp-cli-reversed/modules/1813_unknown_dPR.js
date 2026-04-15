function dPR(T, R) {
  let a = T.arguments?.map(t => ({
      name: t.name,
      required: t.required ?? !1
    })) || [],
    e = {
      uri: d0(`mcp://${R}/${T.name}`),
      label: `${R}/${T.name}`,
      detail: T.description || `From ${R}`,
      insertText: "",
      filterText: `${T.name} ${T.description || ""}`.toLowerCase()
    };
  return {
    ...e,
    kind: "prompt",
    promptData: {
      ...e,
      arguments: a
    }
  };
}