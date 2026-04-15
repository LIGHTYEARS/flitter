function bVR(T) {
  let R = dKR(T).toLowerCase().slice(1);
  if (!R) return "text";
  if (R === "csv") return "csv";
  if (R === "tsv") return "tsv";
  return R;
}
function ZuT(T, R, a) {
  let e = R.length > 1e5 ? R.slice(0, 1e5) + `

[Truncated]` : R,
    t = bVR(T);
  return `${a}: ${T}
\`\`\`${t}
${e}
\`\`\``;
}
function JuT(T) {
  return T.startsWith("image/") || uVR.has(T) || yVR.has(T) || T === "application/pdf";
}
function TyT(T) {
  return T = T.replace(/^(\s*)style\s+\S+/gim, "$1%% removed style"), T = T.replace(/^(\s*)classDef\s+/gim, "$1%% removed classDef "), T = T.replaceAll("<br/>", " "), T;
}
function vVR(T, R) {
  switch (T.type) {
    case "response.output_text.delta":
      R.onTextDelta(T.delta);
      break;
    case "response.reasoning_summary_text.delta":
      R.onReasoningDelta(T.delta);
      break;
    case "response.reasoning_summary_text.done":
      R.onReasoningDelta(`

`);
      break;
    case "response.output_item.added":
      if (T.item.type === "function_call") R.onToolCallAdded(T.output_index, {
        id: T.item.call_id,
        name: T.item.name,
        arguments: T.item.arguments
      });
      break;
    case "response.function_call_arguments.delta":
      R.onToolCallArgumentsDelta(T.output_index, T.delta);
      break;
    case "response.completed":
      if (T.response.usage) R.onUsage(T.response.usage);
      break;
  }
}