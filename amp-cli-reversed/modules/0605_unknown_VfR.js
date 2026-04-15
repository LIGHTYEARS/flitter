function VfR(T, R) {
  let a = {
    ...(R?.startTime !== void 0 ? {
      startTime: R.startTime
    } : {}),
    ...(R?.finalTime !== void 0 ? {
      finalTime: R.finalTime
    } : {})
  };
  switch (T.type) {
    case "tool_use":
      {
        if (!IN.test(T.name)) return {
          type: "tool_use",
          complete: !0,
          id: T.id,
          name: hG,
          input: {
            invalid_tool_name: T.name,
            ...T.input
          },
          ...a
        };
        let e = T.__json_buf;
        if (e) try {
          let t = JSON.parse(e);
          return {
            type: "tool_use",
            complete: !0,
            id: T.id,
            name: T.name,
            input: t,
            ...a
          };
        } catch {
          return {
            type: "tool_use",
            complete: !1,
            id: T.id,
            name: T.name,
            inputPartialJSON: {
              json: e
            },
            input: e ? rlR(e) : {},
            inputIncomplete: e ? u8T(e) : {},
            ...a
          };
        }
        return {
          type: "tool_use",
          complete: !0,
          id: T.id,
          name: T.name,
          input: T.input,
          ...a
        };
      }
    case "text":
      return {
        type: "text",
        text: T.text,
        ...a
      };
    case "thinking":
      return {
        ...T,
        provider: "anthropic",
        ...a
      };
    case "redacted_thinking":
      return {
        ...T,
        provider: "anthropic",
        ...a
      };
    case "server_tool_use":
      return {
        type: "server_tool_use",
        id: T.id,
        name: T.name,
        input: T.input,
        ...a
      };
  }
}