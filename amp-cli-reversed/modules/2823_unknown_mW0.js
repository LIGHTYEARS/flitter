function mW0(T, R) {
  let a = [];
  if (T.totalAdditions > 0) a.push(new G(`+${T.totalAdditions}`, new cT({
    color: R.app.diffAdded
  })));
  if (T.totalDeletions > 0) {
    if (a.length > 0) a.push(new G(" "));
    a.push(new G(`-${T.totalDeletions}`, new cT({
      color: R.app.diffRemoved
    })));
  }
  return a;
}