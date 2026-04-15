function FC0(T, R) {
  let a = T.command("permissions").alias("permission").summary("Manage permissions").description(`Configure and test tool permissions to control what actions the AI agent can take.

See ${oR.underline("https://ampcode.com/manual#permissions")} for more details`).enablePositionalOptions();
  GC0(a, R), KC0(a, R), VC0(a, R), XC0(a, R);
}