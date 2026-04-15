function e3T(T, R) {
  let a = T.choices.map(e => {
    if (e.finish_reason === "length") throw new X8T();
    if (e.finish_reason === "content_filter") throw new Y8T();
    return ENT(e.message.tool_calls), {
      ...e,
      message: {
        ...e.message,
        ...(e.message.tool_calls ? {
          tool_calls: e.message.tool_calls?.map(t => ACR(R, t)) ?? void 0
        } : void 0),
        parsed: e.message.content && !e.message.refusal ? lCR(R, e.message.content) : null
      }
    };
  });
  return {
    ...T,
    choices: a
  };
}