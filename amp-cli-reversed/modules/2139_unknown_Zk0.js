function Zk0(T, R) {
  let a = [T, "[options]"];
  if ((R.subcommands?.length ?? 0) > 0) a.push("[command]");
  for (let e of R.positionals) a.push(e.required ? `<${e.name}>` : `[${e.name}]`);
  return a.join(" ");
}