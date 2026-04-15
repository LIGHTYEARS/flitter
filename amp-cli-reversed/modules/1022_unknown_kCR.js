function bCR(T) {
  return typeof T.parse === "function";
}
function uCR(T, R = Wa.ALL) {
  if (typeof T !== "string") throw TypeError(`expecting str, got ${typeof T}`);
  if (!T.trim()) throw Error(`${T} is empty`);
  return yCR(T.trim(), R);
}
function kCR(T, R) {
  let {
      id: a,
      choices: e,
      created: t,
      model: r,
      system_fingerprint: h,
      ...i
    } = T,
    c = {
      ...i,
      id: a,
      choices: e.map(({
        message: s,
        finish_reason: A,
        index: l,
        logprobs: o,
        ...n
      }) => {
        if (!A) throw new Y0(`missing finish_reason for choice ${l}`);
        let {
            content: p = null,
            function_call: _,
            tool_calls: m,
            ...b
          } = s,
          y = s.role;
        if (!y) throw new Y0(`missing role for choice ${l}`);
        if (_) {
          let {
            arguments: u,
            name: P
          } = _;
          if (u == null) throw new Y0(`missing function_call.arguments for choice ${l}`);
          if (!P) throw new Y0(`missing function_call.name for choice ${l}`);
          return {
            ...n,
            message: {
              content: p,
              function_call: {
                arguments: u,
                name: P
              },
              role: y,
              refusal: s.refusal ?? null
            },
            finish_reason: A,
            index: l,
            logprobs: o
          };
        }
        if (m) return {
          ...n,
          index: l,
          finish_reason: A,
          logprobs: o,
          message: {
            ...b,
            role: y,
            content: p,
            refusal: s.refusal ?? null,
            tool_calls: m.map((u, P) => {
              let {
                  function: k,
                  type: x,
                  id: f,
                  ...v
                } = u,
                {
                  arguments: g,
                  name: I,
                  ...S
                } = k || {};
              if (f == null) throw new Y0(`missing choices[${l}].tool_calls[${P}].id
${gC(T)}`);
              if (x == null) throw new Y0(`missing choices[${l}].tool_calls[${P}].type
${gC(T)}`);
              if (I == null) throw new Y0(`missing choices[${l}].tool_calls[${P}].function.name
${gC(T)}`);
              if (g == null) throw new Y0(`missing choices[${l}].tool_calls[${P}].function.arguments
${gC(T)}`);
              return {
                ...v,
                id: f,
                type: x,
                function: {
                  ...S,
                  name: I,
                  arguments: g
                }
              };
            })
          }
        };
        return {
          ...n,
          message: {
            ...b,
            content: p,
            role: y,
            refusal: s.refusal ?? null
          },
          finish_reason: A,
          index: l,
          logprobs: o
        };
      }),
      created: t,
      model: r,
      object: "chat.completion",
      ...(h ? {
        system_fingerprint: h
      } : {})
    };
  return nCR(c, R);
}