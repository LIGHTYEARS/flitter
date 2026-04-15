function o7(T, R, a) {
  let e = Ur(a?.logger);
  if (!wt(R.status)) {
    e.error("runToBlockParam", "run is not terminal", {
      run: R
    });
    return;
  }
  let t = [];
  switch (R.status) {
    case "done":
      t = aIR(R.result, {
        stripGuidanceFiles: a?.stripGuidanceFiles
      });
      break;
    case "error":
      t = [{
        type: "text",
        text: R.error ? I8T(R.error) : "unknown error"
      }];
      break;
    case "rejected-by-user":
      t = [{
        type: "text",
        text: "User rejected invoking the tool"
      }];
      break;
    case "cancelled":
      if (R.progress) t = [{
        type: "text",
        text: `The user cancelled the tool so it is no longer running. Progress until cancelation:
${JfR(R.progress)}
--- Tool was cancelled and is no longer running
`
      }];else t = [{
        type: "text",
        text: "User cancelled tool invocation"
      }];
      break;
    default:
      throw Error("(bug) unreachable");
  }
  return {
    type: "tool_result",
    tool_use_id: T,
    content: t,
    is_error: R.status === "error" || R.status === "cancelled" || R.status === "rejected-by-user"
  };
}