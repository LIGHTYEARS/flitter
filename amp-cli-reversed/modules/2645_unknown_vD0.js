async function vD0(T, R, a) {
  let e = sD0.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: !0
    }),
    t = () => {
      v0("Commands:"), v0("  shell <cmd>"), v0("  shell-hidden <cmd>"), v0("  $ <cmd> (alias for shell)"), v0("  $$ <cmd> (alias for shell-hidden)"), v0("  send <text>"), v0("  send-agent <mode> <text>"), v0("  edit <index> <text>"), v0("  truncate <index>"), v0("  queue <text>"), v0("  discard-queue"), v0("  title <text>"), v0("  cancel"), v0("  cancel-streaming"), v0("  retry"), v0("  clear-ephemeral"), v0("  test-ephemeral <message>"), v0("  test-retry <seconds> <message>"), v0("  create-thread"), v0("  handoff <goal>"), v0("  switch <threadId>"), v0("  switch-recent <index>"), v0("  back"), v0("  forward"), v0("  restore <index>"), v0("  visibility <public|unlisted|private|workspace|group>"), v0("  files-affected <index>"), v0("  guidance-files"), v0("  clear-pending-navigation"), v0("  system-prompt-deps"), v0("  list-tools"), v0("  wait [ms]"), v0("  drain [ms]"), v0("  drain-until-complete [ms]"), v0("  quit");
    };
  t();
  for await (let r of e) {
    let h = r.trim();
    if (!h) continue;
    if (h === "quit" || h === "exit") {
      e.close();
      break;
    }
    if (h === "help") {
      t();
      continue;
    }
    await CJT(T, R, [h], a);
  }
}