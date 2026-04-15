function I8T(T) {
  let R = [`<error>${T.message}</error>`];
  switch (T.errorCode) {
    case "reading-secret-file":
      R.push(Sa`<secret-file-instruction>
				You MUST never read or modify secret files in any way, including by using cat, sed, echo, or rm through the Bash tool.
				Instead, ask the user to provide the information you need to complete the task, or ask the user to manually edit the secret file.
				</secret-file-instruction>`);
  }
  return R.join(`
`);
}