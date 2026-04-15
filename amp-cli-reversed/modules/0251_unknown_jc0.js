function jc0(T) {
  let R = [...$c0];
  if (T?.team?.disablePrivateThreads) {
    let a = R.indexOf("private");
    if (a !== -1) R.splice(a, 1);
  }
  if (T?.team?.groups && T.team.groups.length > 0) R.push("group");
  return R;
}